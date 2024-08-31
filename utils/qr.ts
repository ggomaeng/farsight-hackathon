import QRCode from "qrcode";

interface QrCodeOptions {
  userId: string;
  width?: number;
}

export async function generateQrCodeBase64({
  userId,
  width = 500,
}: QrCodeOptions) {
  try {
    // Generate QR code to data URL
    const qrCodeDataUrl = await QRCode.toDataURL(
      `https://warpcast.com/${userId}`,
      {
        width,
        margin: 2,
        color: {
          dark: "#fff", // Dark color
          light: "#115dfe", // Light color
        },
      }
    );

    // Remove the "data:image/png;base64," prefix to get raw base64 data

    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}
