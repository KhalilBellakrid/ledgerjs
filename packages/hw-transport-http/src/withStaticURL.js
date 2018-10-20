// @flow
import HttpTransport from "./HttpTransport";
import WebSocketTransport from "./WebSocketTransport";
import Transport from "@ledgerhq/hw-transport";
import type {
  Observer,
  DescriptorEvent,
  Subscription
} from "@ledgerhq/hw-transport";

export default (urlArg: ?string): Class<Transport<*>> => {
  const url = urlArg;
  if (!url) return HttpTransport; // by default, HttpTransport don't yield anything in list/listen
  const RelevantTransport = !url.startsWith("ws")
    ? HttpTransport
    : WebSocketTransport;

  class StaticTransport extends Transport<typeof RelevantTransport> {
    static isSupported = HttpTransport.isSupported;

    static list = (): Promise<*[]> =>
      RelevantTransport.open(url)
        .then(t => t.close())
        .then(() => [url], () => []);

    static listen = (observer: Observer<DescriptorEvent<*>>): Subscription => {
      let unsubscribed = false;
      function attemptToConnect() {
        if (unsubscribed) return;
        RelevantTransport.open(url)
          .then(t => t.close())
          .then(
            () => {
              if (unsubscribed) return;
              observer.next({ type: "add", descriptor: url });
              observer.complete();
            },
            e => {
              console.log(e);
              if (unsubscribed) return;
              setTimeout(attemptToConnect, 1000);
            }
          );
      }
      attemptToConnect();
      return {
        unsubscribe: () => {
          unsubscribed = true;
        }
      };
    };

    static async open(d) {
      return RelevantTransport.open(d);
    }
  }

  return StaticTransport;
};
