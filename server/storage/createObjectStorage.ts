import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createId } from "../gameStore/createId";

type UploadedObject = {
  storageKey: string;
  url: string;
};

type ObjectStorage = {
  configured: boolean;
  uploadImage: (file: Express.Multer.File) => Promise<UploadedObject>;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");

const assertUploadEndpoint = (endpoint: string): void => {
  if (endpoint.includes(".cdn.digitaloceanspaces.com")) {
    throw new Error("S3_ENDPOINT must be the Spaces origin endpoint, not the CDN endpoint");
  }
};

const createPublicUrl = (storageKey: string): string => {
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  if (publicBaseUrl) {
    return `${trimTrailingSlash(publicBaseUrl)}/${storageKey}`;
  }

  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;

  if (!endpoint || !bucket) {
    throw new Error("Missing S3_PUBLIC_BASE_URL or S3_ENDPOINT/S3_BUCKET");
  }

  return `${trimTrailingSlash(endpoint)}/${bucket}/${storageKey}`;
};

export const createObjectStorage = (): ObjectStorage => {
  const configured = Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_REGION &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
  );

  if (!configured) {
    return {
      configured,
      uploadImage: async () => {
        throw new Error("S3 storage is not configured");
      }
    };
  }

  const endpoint = process.env.S3_ENDPOINT ?? "";
  assertUploadEndpoint(endpoint);

  const client = new S3Client({
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ""
    }
  });

  const uploadImage = async (file: Express.Multer.File): Promise<UploadedObject> => {
    const extension = file.originalname.includes(".") ? file.originalname.split(".").pop() : "bin";
    const prefix = trimSlashes(process.env.S3_KEY_PREFIX ?? "alignment");
    const storageKey = `${prefix}/uploads/${new Date().toISOString().slice(0, 10)}/${createId("img")}.${extension}`;

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: storageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read"
      })
    );

    return {
      storageKey,
      url: createPublicUrl(storageKey)
    };
  };

  return {
    configured,
    uploadImage
  };
};
