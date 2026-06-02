#!/usr/bin/env tsx
/**
 * npm run resolve-sharepoint-ids -- "<URL_DA_PASTA>"
 *
 * Resolve SHAREPOINT_SITE_ID, SHAREPOINT_DRIVE_ID e SHAREPOINT_FOLDER_ITEM_ID
 * a partir da URL da pasta SharePoint. Execute 1x por cliente no kickoff.
 *
 * Requer em .env.local:
 *   SHAREPOINT_TENANT_ID
 *   SHAREPOINT_CLIENT_ID
 *   SHAREPOINT_CLIENT_SECRET
 *
 * Exemplo:
 *   tsx scripts/resolve-sharepoint-ids.ts \
 *     "https://institutoareluna.sharepoint.com/sites/Comercial/Shared%20Documents/Gravacoes"
 */

import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

async function main() {
  const { config } = await import("dotenv").catch(() => ({ config: () => {} }));
  config({ path: ".env.local" });

  const tenantId = process.env.SHAREPOINT_TENANT_ID;
  const clientId = process.env.SHAREPOINT_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.error(
      "❌ Faltam variáveis no .env.local: SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET",
    );
    process.exit(1);
  }

  const folderUrl = process.argv[2];
  if (!folderUrl) {
    console.error("❌ Uso: tsx scripts/resolve-sharepoint-ids.ts <URL_DA_PASTA>");
    process.exit(1);
  }

  // Parseia URL → hostname, sitePath, folderPath
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(decodeURIComponent(folderUrl));
  } catch {
    console.error(`❌ URL inválida: "${folderUrl}"`);
    process.exit(1);
  }

  const hostname = parsedUrl.hostname;
  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

  // Identifica /sites/<nomeSite> (ou /teams/<nomeSite>)
  const sitePrefixIdx = pathParts.findIndex((p) => p === "sites" || p === "teams");
  if (sitePrefixIdx === -1 || sitePrefixIdx + 1 >= pathParts.length) {
    console.error(
      `❌ Não encontrei /sites/<nome> na URL. Exemplo esperado: https://tenant.sharepoint.com/sites/NomeSite/...`,
    );
    process.exit(1);
  }

  const sitePath = `/${pathParts.slice(0, sitePrefixIdx + 2).join("/")}`;
  const folderPath = "/" + pathParts.slice(sitePrefixIdx + 2).join("/");

  console.log(`\n🔍 Resolvendo IDs para:`);
  console.log(`   Hostname:    ${hostname}`);
  console.log(`   Site path:   ${sitePath}`);
  console.log(`   Folder path: ${folderPath}\n`);

  // Obtém token
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  let accessToken: string;
  try {
    const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
    if (!tokenResponse) throw new Error("Token nulo");
    accessToken = tokenResponse.token;
  } catch (err) {
    console.error(
      "❌ Falha na autenticação. Verifica SHAREPOINT_TENANT_ID / SHAREPOINT_CLIENT_ID / SHAREPOINT_CLIENT_SECRET",
    );
    console.error("   Detalhe:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  // 1. Resolve Site ID
  const siteEndpoint = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
  const siteRes = await fetch(siteEndpoint, { headers });
  if (!siteRes.ok) {
    if (siteRes.status === 403) {
      console.error(
        "❌ Sem permissão. O App Registration precisa de admin consent para Sites.Read.All",
      );
      console.error("   Pede pro admin do tenant conceder as permissões em portal.azure.com");
    } else if (siteRes.status === 404) {
      console.error(`❌ Site não encontrado em ${sitePath}. Confirma a URL.`);
    } else {
      console.error(`❌ Erro ao buscar site: ${siteRes.status} ${siteRes.statusText}`);
    }
    process.exit(1);
  }
  const siteData = (await siteRes.json()) as { id: string };
  const siteId = siteData.id;
  console.log(`✅ Site ID:          ${siteId}`);

  // 2. Resolve Drive ID (Shared Documents / Documents)
  const drivesEndpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
  const drivesRes = await fetch(drivesEndpoint, { headers });
  if (!drivesRes.ok) {
    console.error(`❌ Erro ao listar drives: ${drivesRes.status} ${drivesRes.statusText}`);
    process.exit(1);
  }
  const drivesData = (await drivesRes.json()) as {
    value: Array<{ id: string; name: string; driveType: string; webUrl: string }>;
  };
  // Pega o primeiro drive do tipo "documentLibrary" (Shared Documents)
  const drive = drivesData.value.find((d) => d.driveType === "documentLibrary");
  if (!drive) {
    console.error("❌ Nenhum drive documentLibrary encontrado no site.");
    console.error("   Drives disponíveis:", drivesData.value.map((d) => d.name).join(", "));
    process.exit(1);
  }
  const driveId = drive.id;
  console.log(`✅ Drive ID:         ${driveId}  (${drive.name})`);

  // 3. Resolve Folder Item ID
  // O path na URL inclui o nome da biblioteca (ex: "Shared Documents") que é a raiz do drive.
  // Calculamos o path relativo ao drive subtraindo o webUrl do drive do path original.
  const decodedOriginalPath = decodeURIComponent(parsedUrl.pathname);
  const decodedDrivePath = drive.webUrl ? decodeURIComponent(new URL(drive.webUrl).pathname) : null;
  const relativeFolderPath =
    decodedDrivePath && decodedOriginalPath.startsWith(decodedDrivePath)
      ? decodedOriginalPath.slice(decodedDrivePath.length) || "/"
      : folderPath;

  let folderEndpoint: string;
  if (relativeFolderPath === "/") {
    folderEndpoint = `https://graph.microsoft.com/v1.0/drives/${driveId}/root`;
  } else {
    const encodedRelPath = encodeURIComponent(relativeFolderPath).replace(/%2F/g, "/");
    folderEndpoint = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedRelPath}`;
  }

  const folderRes = await fetch(folderEndpoint, { headers });
  if (!folderRes.ok) {
    if (folderRes.status === 404) {
      console.error(`❌ Pasta não encontrada: "${relativeFolderPath}". Confirma a URL.`);
    } else {
      console.error(`❌ Erro ao buscar pasta: ${folderRes.status} ${folderRes.statusText}`);
    }
    process.exit(1);
  }
  const folderData = (await folderRes.json()) as {
    id: string;
    folder?: { childCount: number };
  };
  const folderItemId = folderData.id;
  const arquivosNaPasta = folderData.folder?.childCount ?? 0;
  console.log(`✅ Folder Item ID:   ${folderItemId}`);
  console.log(
    `✅ Pasta confirmada: ${relativeFolderPath} (${arquivosNaPasta} item(s) no momento)\n`,
  );

  console.log("─".repeat(60));
  console.log("Adiciona ao .env.local (e às env vars do Vercel):\n");
  console.log(`SHAREPOINT_SITE_ID=${siteId}`);
  console.log(`SHAREPOINT_DRIVE_ID=${driveId}`);
  console.log(`SHAREPOINT_FOLDER_ITEM_ID=${folderItemId}`);
  console.log("─".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
