import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

const client = new S3Client({
  endpoint: env.storageEndpoint,
  region: env.storageRegion,
  credentials: {
    accessKeyId: env.storageAccessKeyId,
    secretAccessKey: env.storageSecretAccessKey,
  },
  forcePathStyle: true,
});

export async function checkStorage() {
  await client.send(new HeadBucketCommand({ Bucket: env.storageBucket }));
}

export async function putObject(key, body, contentType = "application/octet-stream") {
  await client.send(
    new PutObjectCommand({
      Bucket: env.storageBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(key) {
  const response = await client.send(new GetObjectCommand({ Bucket: env.storageBucket, Key: key }));

  if (!response.Body) {
    throw new Error("Object storage returned an empty object body");
  }

  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteObject(key) {
  await client.send(new DeleteObjectCommand({ Bucket: env.storageBucket, Key: key }));
}

export function closeStorage() {
  client.destroy();
}