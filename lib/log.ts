type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function emit(level: LogLevel, event: string, payload?: LogPayload) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...payload,
  };
  const serialized = JSON.stringify(record);

  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export const log = {
  debug: (event: string, payload?: LogPayload) => emit("debug", event, payload),
  info: (event: string, payload?: LogPayload) => emit("info", event, payload),
  warn: (event: string, payload?: LogPayload) => emit("warn", event, payload),
  error: (event: string, payload?: LogPayload) => emit("error", event, payload),
};
