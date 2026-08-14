/// <reference types="astro/client" />

type ENV = {
  PUBLIC_CLOUDINARY_CLOUD_NAME: string;
  PUBLIC_CLOUDINARY_UPLOAD_PRESET: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}
