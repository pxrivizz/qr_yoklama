export function geolocationErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? Number(error.code)
      : undefined;

  const rawMessage =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message
      : undefined;

  let message =
    "Konum alınamadı. Telefonunuzun konum servisini ve tarayıcıdaki site iznini kontrol edip tekrar deneyin.";

  if (code === 1) {
    message =
      "Konum izni verilmedi. Tarayıcının site ayarlarından Konum iznini Açık veya İzin Ver yapıp tekrar deneyin.";
  } else if (code === 2) {
    message =
      "Telefon konumunuzu belirleyemedi. Konum servislerini açın, mümkünse açık bir alana yaklaşın ve tekrar deneyin.";
  } else if (code === 3) {
    message =
      "Konum alınırken süre doldu. Telefonun konum servisinin açık olduğunu kontrol edip tekrar deneyin.";
  }

  if (rawMessage && !message.includes(rawMessage)) {
    return `${message} (Detay: ${rawMessage})`;
  }

  return message;
}
