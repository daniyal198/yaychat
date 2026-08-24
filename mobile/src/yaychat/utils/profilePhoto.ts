import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

/** Opens the native image picker and keeps a durable app-local copy. */
export const chooseProfilePhoto = async (): Promise<string | null> => {
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
    return copy.localUri;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
};
