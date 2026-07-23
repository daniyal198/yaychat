import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { pick } from '@react-native-documents/picker';
import { colors } from '../../theme/colors';
import UploadIcon from '../../../assets/splash/solar_upload-broken.svg';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SubscriptionStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  createFiatDepositForOrder,
  getPresignedUrl,
} from '../../services/auth.service';
import OvalButton from '../../components/OvalButton';
import CancelIcon from '../../../assets/img/cancelIcon.svg';
import CheckIcon from '../../../assets/img/checkIcon.svg';
const UploadFileScreen = () => {
  const [selectedFile, setSelectedFile] = useState<null | {
    name: string;
    size: number;
    type: string;
    uri: string;
  }>(null);
  const route = useRoute<RouteProp<SubscriptionStackParamList, 'UploadFile'>>();
  const {
    orderId,
    paymentType,
    amount,
    currency,
    email,
    fromDetails,
    toDetails,
  } = route.params;

  const navigation =
    useNavigation<NativeStackNavigationProp<SubscriptionStackParamList>>();
  const [uploading, setUploading] = useState(false);

  const pickDocument = async () => {
    try {
      const response = await pick();
      
      if (response.length > 0) {
        const file = response[0];
        if (file.name && file.size && file.type && file.uri) {
          setSelectedFile({
            name: file.name,
            size: file.size,
            type: file.type,
            uri: file.uri,
          });
        } else {
          Alert.alert('Error', 'Incomplete file data');
        }
      }
    } catch (err) {
      console.error('DocumentPicker Error:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit0 = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setUploading(true);

    try {
      // 1. Get pre-signed URL from your backend
      const presignedResponse = await getPresignedUrl(selectedFile?.type);
      console.log('Presigned URL Response:', presignedResponse);

      const { url, fields } = presignedResponse.data;

      // 2. Create FormData for the upload
      const formData = new FormData();

      // Append all required fields from the presigned response
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });

      // Append the file - React Native specific format
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      });

      // 3. Upload to S3
      // Try PUT first, then fall back to POST if needed
      let uploadResponse;
      try {
        uploadResponse = await fetch(url, {
          method: 'PUT', // First try PUT
          body: formData,
          headers: {
            'Content-Type': selectedFile.type, // For PUT, use file's content type
          },
        });
      } catch (putError) {
        console.log('PUT failed, trying POST...', putError);
        uploadResponse = await fetch(url, {
          method: 'POST', // Fall back to POST
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      console.log('Upload Status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        Alert.alert('Upload Failed', 'Failed to upload file to S3');
        return;
      }

      // 4. Construct the URL where the file can be accessed
      // Note: This depends on your S3 configuration
      const uploadedFileUrl = `${url.split('?')[0]}/${fields.key}`;

      // 5. Notify your backend about the successful upload
      const result = await createFiatDepositForOrder(
        String(email),
        String(orderId),
        fromDetails,
        toDetails,
        uploadedFileUrl,
      );

      if (result.success) {
        navigation.navigate('TrackSubscription', {
          orderId,
          paymentType,
          amount,
          currency,
        });
      } else {
        Alert.alert('Error', result.message || 'Deposit creation failed');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'An error occurred during file upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit1 = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setUploading(true);

    try {
      // 1. Get pre-signed URL with file type information
      const presignedResponse = await getPresignedUrl(selectedFile.type);
      const { url, fields } = presignedResponse.data;

      console.log('Presigned URL Response:', presignedResponse);

      // 2. Create FormData for the upload
      const formData = new FormData();

      // Append all fields from the presigned URL
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Append the file (must be last field)
      formData.append('file', {
        uri: selectedFile.uri,
        name: fields.key || selectedFile.name,
        type: selectedFile.type,
      });

      // 3. Upload to S3
      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData,
        // NOTE: Do NOT set Content-Type header - let React Native set it automatically
        // with the correct boundary parameter
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // 4. Construct the final URL (use the URL from fields)
      const uploadedFileUrl = `${url}/${fields.key}`;

      // 5. Notify your backend
      const result = await createFiatDepositForOrder(
        String(email),
        String(orderId),
        fromDetails,
        toDetails,
        uploadedFileUrl,
      );

      if (!result.success) {
        throw new Error(result.message || 'Deposit creation failed');
      }

      navigation.navigate('TrackSubscription', {
        orderId,
        paymentType,
        amount,
        currency,
      });
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Failed', error.message || 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setUploading(true);

    try {
      // 1. Get pre-signed URL
      const presignedResponse = await getPresignedUrl(selectedFile.type);
      const { url, key, contentType } = presignedResponse.data; // Changed to match backend response

      // 2. Read the file content as base64 and convert to Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          reject(new Error('Failed to create blob'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', selectedFile.uri, true);
        xhr.send(null);
      });

      // 3. Upload to S3 using PUT
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': contentType || selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // 4. Construct the final URL
      const uploadedFileUrl = `https://indexx-exchange.s3.ap-northeast-1.amazonaws.com/${encodeURIComponent(
        key,
      )}`;

      console.log(
        String(email),
        String(orderId),
        fromDetails,
        toDetails,
        uploadedFileUrl,
      );
      // 5. Notify your backend
      const result = await createFiatDepositForOrder(
        String(email),
        String(orderId),
        fromDetails,
        toDetails,
        uploadedFileUrl,
      );

      if (result.status !== 200) {
        throw new Error(result.message || 'Deposit creation failed');
      }

      navigation.navigate('TrackSubscription', {
        orderId,
        paymentType,
        amount,
        currency,
      });
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Failed', error.message || 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.dottedBorderContainer}
          onPress={pickDocument}
          activeOpacity={0.7}>
          <UploadIcon />
          <Text style={styles.title}>Upload your file here</Text>
          <Text
            style={[
              styles.title,
              {
                color: colors.primary,
                fontSize: 16,
                textDecorationLine: 'underline',
              },
            ]}>
            Browse
          </Text>
          {selectedFile && (
            <View style={styles.fileInfo}>
              <Text
                style={styles.fileName}
                numberOfLines={1}
                ellipsizeMode="middle">
                {selectedFile.name}
              </Text>
              <Text style={styles.fileSize}>
                {Math.round(selectedFile.size / 1024)} KB
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.buttonContainer}>
          {/* <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => setSelectedFile(null)}>
            <Text style={styles.outlineButtonText}>Cancel</Text>
          </TouchableOpacity> */}
          <OvalButton
            label="Cancel"
            onPress={() => setSelectedFile(null)}
            IconInsideOval={CancelIcon}
          />
          {/* <TouchableOpacity
            style={[styles.button, uploading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={!selectedFile || uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Submit</Text>
            )}
          </TouchableOpacity> */}
          <OvalButton
            label="Submit"
            onPress={handleSubmit}
            IconInsideOval={CheckIcon}
            loading={uploading}
            disabled={!selectedFile || uploading}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  dottedBorderContainer: {
    borderWidth: 2,
    width: '100%',
    borderColor: colors.primary,
    borderStyle: 'dotted',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    marginVertical: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 30,
    width: '100%',
    justifyContent: 'center',
    marginTop: 40,
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 12,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    opacity: 1,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  outlineButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F88D39',
    width: '48%',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#F88D39',
    fontSize: 16,
    fontWeight: '500',
  },
  fileInfo: {
    marginTop: 15,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  fileName: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 5,
    maxWidth: '90%',
  },
  fileSize: {
    color: '#d5d5d5',
    fontSize: 12,
  },
});

export default UploadFileScreen;
