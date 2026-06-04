import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

let cachedClient: Client | null = null;

function getGraphClient(): Client {
  if (cachedClient) return cachedClient;

  const credential = new ClientSecretCredential(
    process.env.SHAREPOINT_TENANT_ID!,
    process.env.SHAREPOINT_CLIENT_ID!,
    process.env.SHAREPOINT_CLIENT_SECRET!,
  );

  cachedClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken("https://graph.microsoft.com/.default");
        if (!token) throw new Error("Falha ao obter token Microsoft Graph");
        return token.token;
      },
    },
  });

  return cachedClient;
}

export type SharePointFile = {
  id: string;
  name: string;
  size: number;
  createdDateTime: string;
  webUrl: string;
  downloadUrl: string;
  mimeType: string;
  closerFolderName?: string; // presente quando o arquivo está numa subpasta nomeada pelo closer
};

type RawItem = Record<string, unknown>;

function mapItem(item: RawItem, closerFolderName?: string): SharePointFile {
  return {
    id: item.id as string,
    name: item.name as string,
    size: item.size as number,
    createdDateTime: item.createdDateTime as string,
    webUrl: item.webUrl as string,
    downloadUrl: (item["@microsoft.graph.downloadUrl"] as string | undefined) ?? "",
    mimeType: (item.file as { mimeType: string }).mimeType,
    ...(closerFolderName ? { closerFolderName } : {}),
  };
}

export async function listarArquivosDaPasta(): Promise<SharePointFile[]> {
  const client = getGraphClient();
  const driveId = process.env.SHAREPOINT_DRIVE_ID!;
  const folderId = process.env.SHAREPOINT_FOLDER_ITEM_ID!;

  const response = await client
    .api(`/drives/${driveId}/items/${folderId}/children`)
    .select("id,name,size,createdDateTime,webUrl,file,folder")
    .top(200)
    .get();

  const arquivos: SharePointFile[] = [];

  for (const item of response.value as RawItem[]) {
    if (item.file) {
      // Arquivo direto na raiz da pasta monitorada
      arquivos.push(mapItem(item));
    } else if (item.folder) {
      // Subpasta: o nome é o closer — lista os arquivos dentro
      const subRes = await client
        .api(`/drives/${driveId}/items/${item.id as string}/children`)
        .select("id,name,size,createdDateTime,webUrl,file")
        .top(200)
        .get();

      for (const sub of subRes.value as RawItem[]) {
        if (sub.file) {
          arquivos.push(mapItem(sub, item.name as string));
        }
      }
    }
  }

  return arquivos;
}

/**
 * Obtém a downloadUrl pré-assinada do SharePoint sem baixar o arquivo.
 * Útil para passar a URL para serviços externos (AssemblyAI) que baixam por conta própria.
 * A URL é válida por ~1h — use imediatamente.
 */
export async function obterDownloadUrl(itemId: string): Promise<string> {
  const client = getGraphClient();
  const driveId = process.env.SHAREPOINT_DRIVE_ID!;

  const metadata = await client
    .api(`/drives/${driveId}/items/${itemId}`)
    .select("@microsoft.graph.downloadUrl")
    .get();

  const downloadUrl = metadata["@microsoft.graph.downloadUrl"] as string | undefined;
  if (!downloadUrl) {
    throw new Error(`downloadUrl ausente para o item SharePoint ${itemId}`);
  }

  return downloadUrl;
}

export async function baixarArquivo(
  itemId: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const client = getGraphClient();
  const driveId = process.env.SHAREPOINT_DRIVE_ID!;

  // Busca metadata sem $select para garantir que a anotação @microsoft.graph.downloadUrl seja retornada
  const metadata = await client.api(`/drives/${driveId}/items/${itemId}`).get();

  const downloadUrl = metadata["@microsoft.graph.downloadUrl"] as string | undefined;
  if (!downloadUrl) throw new Error(`downloadUrl ausente para o item ${itemId}`);

  // Download direto pela URL pré-assinada (não passa pelo Graph, usa o CDN do SharePoint)
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Download falhou: ${res.status} ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    buffer,
    mimeType: (metadata.file as { mimeType: string }).mimeType,
    fileName: metadata.name as string,
  };
}
