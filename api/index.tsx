import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { neynar } from "frog/middlewares";
import { serveStatic } from "frog/serve-static";
import { handle } from "frog/vercel";
import {
  BOND_ABI,
  generateCreateArgs,
  getMintClubContractAddress,
} from "mint.club-v2-sdk";
import queryString from "query-string";
import { generateQrCodeBase64 } from "../utils/qr.js";

export const app = new Frog({
  title: "Farsight Hackathon Demo",
  assetsPath: "/",
  basePath: "/api",
  imageAspectRatio: "1:1",
  imageOptions: {
    width: 600,
    height: 600,
  },
});

const middleware = neynar({
  apiKey: "NEYNAR_FROG_FM",
  features: ["interactor"],
});

// image generation
app.hono.get("/qr/:username", async (c) => {
  const username = c.req.param("username");
  const base64 = await generateQrCodeBase64({
    userId: username,
  });

  const raw = base64.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(raw, "base64");

  return c.newResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
    },
  });
});

// metadata generation
app.hono.get("/metadata/:username", async (c) => {
  const username = c.req.param("username");
  return c.json({
    name: `Based QR - ${username}`,
    description: "Demonstration for Farsight Hackathon",
    external_url: `https://warpcast.com/${username}`,
    attributes: [{ trait_type: "fname", value: username }],
    image: `https://basedqr.vercel.app/api/qr/${username}`,
  });
});

// mint frame
app.frame("/", middleware, async (c) => {
  const { buttonValue, status, transactionId } = c;

  if (transactionId) {
    const qs = {
      text: "I minted a Based QR code!",
      "embeds[]": ["https://basedqr.vercel.app/api/qr/username"],
    };

    const shareQs = queryString.stringify(qs);
    const warpcastRedirectLink = `https://warpcast.com/~/compose?${shareQs}`;

    return c.res({
      image: (
        <div tw="w-full h-full flex items-center justify-center text-white text-5xl bg-[#115dfe]">
          SUCCESS!
        </div>
      ),
      intents: [<Button.Link href={warpcastRedirectLink}>Share</Button.Link>],
    });
  }

  if (buttonValue === "qr") {
    return c.res({
      image: (
        <img
          src={`/api/qr/${c.var.interactor?.username!}`}
          width={"100%"}
          height={"100%"}
        />
      ),
      intents: [
        <Button.Transaction target="/tx">Mint</Button.Transaction>,
        status === "response" && <Button.Reset>Reset</Button.Reset>,
      ],
    });
  }

  return c.res({
    image: (
      <div tw="w-full h-full flex items-center justify-center text-white text-5xl bg-[#115dfe]">
        BASED QR CODE
      </div>
    ),
    intents: [
      <Button value="qr">Mine</Button>,
      status === "response" && <Button.Reset>Reset</Button.Reset>,
    ],
  });
});

// transaction route
app.transaction("/tx", middleware, async (c) => {
  const username = c.var.interactor?.username;

  const name = `Based QR ${username}`;
  const symbol = `based-qr-${Date.now()}`;

  const { tokenParams, bondParams } = generateCreateArgs({
    name,
    symbol,
    tokenType: "ERC20",
    reserveToken: {
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
    curveData: {
      curveType: "EXPONENTIAL",
      initialMintingPrice: 0.001,
      finalMintingPrice: 1,
      maxSupply: 1000,
      stepCount: 100,
      creatorAllocation: 1,
    },
    buyRoyalty: 1,
    sellRoyalty: 1,
  });

  return c.contract({
    abi: BOND_ABI,
    chainId: "eip155:8453",
    functionName: "createMultiToken",
    to: getMintClubContractAddress("BOND", 8453),
    args: [
      {
        ...tokenParams,
        uri: `https://basedqr.vercel.app/api/metadata/${username}`,
      },
      bondParams,
    ],
  });
});

// share frame
app.frame("/:username", middleware, async (c) => {
  const username = c.req.param("username");
  return c.res({
    image: <img src={`/api/qr/${username}`} width={"100%"} height={"100%"} />,
    intents: [
      <Button action="/" value="qr">
        Mine
      </Button>,
    ],
  });
});

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== "undefined";
const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);
