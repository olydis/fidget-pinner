import { ipcRenderer } from "electron";

let id = 0;

export function callFunc<T, U>(channel: string, arg: T): Promise<U> {
  const callId = ++id;
  return new Promise<U>((res, rej) => 
  {
    const resFunc = (_, id: number, err: any, argRes: U) => {
      if (callId === id) {
        ipcRenderer.removeListener(channel, resFunc);
        if (err) rej(err);
        else res(argRes);
      }
    };
    ipcRenderer.on(channel, resFunc);
    ipcRenderer.send(channel, callId, arg);
  });
}

export function createFunc<T, U>(channel: string, handler: (arg: T) => Promise<U> | U): void {
  const f = async (_, id: number, arg: T) => {
      try {
        const result = await handler(arg);
        ipcRenderer.send(channel, id, null, result);
      } catch (e) {
        ipcRenderer.send(channel, id, e);
      }
  };
  ipcRenderer.on(channel, f);
}

export function signal(channel: string): void {
    ipcRenderer.send(channel);
}