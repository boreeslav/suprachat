// Demo CLI for the TGGate.Bridge message feed reader.
//
// Examples (run with: npm run feed -- <cmd> ...):
//   npm run feed -- tail 20
//   npm run feed -- new 0
//   npm run feed -- search "счёт"
//   npm run feed -- chat @durov
//   npm run feed -- chat 778193
//   npm run feed -- watch            # live: prints new messages every 2s
//
// Override the feed location with env TGGATE_FEED_FILE.

import {
  getByChat,
  getNewMessages,
  latestId,
  resolveFeedPath,
  search,
  tail,
  type FeedMessage,
} from "./tggate-feed.js";

function print(messages: FeedMessage[]): void {
  for (const m of messages) {
    const who = m.peerUsername ? `@${m.peerUsername}` : m.peerTitle ?? m.peerId ?? "?";
    const arrow = m.direction === "tg->sm" ? "<-" : "->";
    const media = m.hasMedia ? ` [${m.contentType ?? "media"}]` : "";
    console.log(`#${m.id} ${m.ts} ${arrow} ${who} | ${m.sender ?? ""}${media}: ${m.text ?? ""}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  console.error(`[feed] ${resolveFeedPath()}`);

  switch (cmd) {
    case "tail":
      print(tail(Number(rest[0]) || 20));
      break;
    case "new":
      print(getNewMessages(Number(rest[0]) || 0));
      break;
    case "search":
      print(search(rest.join(" "), { limit: 50 }));
      break;
    case "chat": {
      const arg = rest[0] ?? "";
      const chat = /^\d+$/.test(arg) ? Number(arg) : arg;
      print(getByChat(chat, { limit: 50 }));
      break;
    }
    case "watch": {
      let cursor = latestId();
      console.error(`[feed] watching from id=${cursor} (Ctrl+C to stop)`);
      for (;;) {
        const fresh = getNewMessages(cursor);
        if (fresh.length) {
          print(fresh);
          cursor = fresh[fresh.length - 1].id;
        }
        await sleep(2000);
      }
    }
    default:
      console.log("usage: tail [n] | new [afterId] | search <query> | chat <id|@username> | watch");
  }
}

main().catch((err) => {
  console.error("feed demo error:", err);
  process.exit(1);
});
