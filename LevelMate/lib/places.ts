export const getPlacePhotoUrl = (photoReference: string, maxWidth = 800): string => {
  return (
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?photo_reference=${photoReference}` +
    `&maxwidth=${maxWidth}` +
    `&key=${process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY}`
  );
};

// TODO: PRODUCTION — delete DEV_PHOTO_URL and uncomment the production return path below
const DEV_PHOTO_URL = 'https://picsum.photos/seed/levelmate/800/500';

export const getSessionPhotoUrl = (_photoReference: string | null | undefined): string | null => {
  return DEV_PHOTO_URL;
  // PRODUCTION: uncomment below, delete the two lines above
  // if (!_photoReference) return null;
  // return getPlacePhotoUrl(_photoReference);
};
