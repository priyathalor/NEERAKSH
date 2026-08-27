// Free image hosting via Cloudinary's unsigned upload API.
// Firebase Storage requires the paid Blaze plan, so photo uploads for the
// submission flow go here instead — no billing needed.

const CLOUD_NAME = "dtohfuhhc";
const UPLOAD_PRESET = "neeraksh";

export async function uploadImageToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Image upload failed");
  }

  const data = await response.json();
  return data.secure_url; // hosted image URL to store in Firestore
}
