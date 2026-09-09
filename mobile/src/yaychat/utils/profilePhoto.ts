import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import {colors} from '../design/tokens';

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Side of the square the cropper writes out. Avatars never render anywhere
 * near this large, so the crop is lossless in practice while still keeping the
 * upload small.
 */
const PROFILE_PHOTO_SIZE = 1024;

/** `openCropper` resolves to a bare filesystem path on iOS; uploads need a URI. */
const toFileUri = (path: string): string =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(path) ? path : `file://${path}`;

const isCancelled = (error: unknown): boolean =>
  (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) ||
  (typeof error === 'object' &&
    error !== null &&
    (error as {code?: string}).code === 'E_PICKER_CANCELLED');

/**
 * True when the framing editor can be reopened on this picture. A photo that
 * has already been uploaded is an `https` URL the native cropper cannot read,
 * so those have to be re-picked rather than re-cropped.
 */
export const isAdjustableProfilePhoto = (uri?: string): boolean =>
  Boolean(uri && /^(content|file):\/\//i.test(uri));

/**
 * Opens the framing editor — crop, zoom, rotate, reposition — on a photo that
 * is already on disk, with the same circular mask the avatar renders through.
 *
 * Returns `null` when the user backs out so callers keep the previous framing
 * instead of clearing the picture.
 */
export const adjustProfilePhoto = async (uri: string): Promise<string | null> => {
  try {
    const cropped = await ImageCropPicker.openCropper({
      path: uri,
      mediaType: 'photo',
      cropping: true,
      width: PROFILE_PHOTO_SIZE,
      height: PROFILE_PHOTO_SIZE,
      // The avatar is an oval, so the mask has to be one too: a square preview
      // is what let people save photos with the top of their head cut off.
      cropperCircleOverlay: true,
      // A circular avatar cannot show a free-form rectangle, and letterboxing
      // inside the circle looks like a broken image.
      freeStyleCropEnabled: false,
      avoidEmptySpaceAroundImage: true,
      showCropGuidelines: false,
      enableRotationGesture: true,
      // HEIC straight off an iPhone camera is not renderable by every surface
      // that shows an avatar, and the uploader keys its content type off the
      // extension.
      forceJpg: true,
      compressImageQuality: 0.92,
      cropperToolbarTitle: 'Adjust your photo',
      cropperToolbarColor: colors.surface,
      cropperToolbarWidgetColor: colors.textPrimary,
      cropperActiveWidgetColor: colors.brand,
      cropperChooseText: 'Use photo',
      cropperCancelText: 'Cancel',
    });
    return toFileUri(cropped.path);
  } catch (error) {
    if (isCancelled(error)) {
      return null;
    }
    throw new Error('That picture could not be opened for editing. Please choose another image.');
  }
};

/**
 * Opens the native image picker, keeps a durable app-local copy, then hands the
 * copy to the framing editor. Resolves to `null` if the user cancels either
 * step.
 */
export const chooseProfilePhoto = async (): Promise<string | null> => {
  let localUri: string;
  try {
    const [file] = await pick({type: types.images, allowMultiSelection: false});
    if (!file.hasRequestedType || (file.type && !file.type.startsWith('image/'))) {
      throw new Error('Choose a JPG, PNG, HEIC, or another image file.');
    }
    if (file.size && file.size > MAX_PROFILE_PHOTO_BYTES) {
      throw new Error('Profile pictures must be 5 MB or smaller.');
    }

    const extension = file.type?.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = file.name || `profile-${Date.now()}.${extension}`;
    const [copy] = await keepLocalCopy({
      files: [{uri: file.uri, fileName}],
      destination: 'documentDirectory',
    });
    if (copy.status === 'error') {
      throw new Error('The selected picture could not be saved. Please choose another image.');
    }
    localUri = copy.localUri;
  } catch (error) {
    if (isCancelled(error)) {
      return null;
    }
    throw error;
  }
  return adjustProfilePhoto(localUri);
};
