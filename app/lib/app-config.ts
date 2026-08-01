/**
 * Server-side environment config (Firebase + Cloudinary).
 * Import ONLY from API routes / server code — never from client components
 * (keeps apiSecret out of the browser bundle).
 *
 * Env vars override defaults when set on Vercel.
 */

const cloudinary = {
  cloudName:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    'atm28akz',
  apiKey: process.env.CLOUDINARY_API_KEY || '674772957329485',
  apiSecret: process.env.CLOUDINARY_API_SECRET || 'HjXePQGIC-5lr41ZV8Kf1LZtT3M',
  uploadPreset:
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    process.env.CLOUDINARY_UPLOAD_PRESET ||
    'aj_portal',
};

const firebase = {
  serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
};

const appConfig = {
  firebase,
  cloudinary,
};

export default appConfig;
export { cloudinary, firebase };
