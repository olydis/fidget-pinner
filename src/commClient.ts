import { ipcRenderer } from "electron";

let id = 0;

export function callFunc<T, U>(channel: string, arg: T): Promise<U> {
  const callId = ++id;
  return new Promise<U>((res, rej) => 
  {
    const resFunc = (_, id, err, argRes: U) => {
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