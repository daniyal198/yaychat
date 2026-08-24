import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {pick, errorCodes, isErrorWithCode} from '@react-native-documents/picker';
import {colors} from '../theme/colors';
import UploadIcon from '../../assets/splash/solar_upload-broken.svg';

type PickedFile = {
  name: string;
  size: number | null;
  type: string | null;
  uri: string;
};

const UploadFileScreen = () => {
  const [selectedFile, setSelectedFile] = useState<PickedFile | null>(null);

  const pickDocument = async () => {
    console.log('clicked');
    try {
      const response = await pick();
      console.log(response, 'response');

      // The response structure is slightly different in this package
      const file = response[0];
      setSelectedFile({
        name: file.name ?? 'document',
        size: file.size,
        type: file.type,
        uri: file.uri,
      });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        console.log('User cancelled document picker');
      } else {
        console.log('DocumentPicker Error:', err);
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    // Here you would upload the file to your server
    console.log('File to upload:', selectedFile);
    Alert.alert('Success', `${selectedFile.name} is ready for upload`);

    // Example upload logic:
    /*
    const formData = new FormData();
    formData.append('file', {
      uri: selectedFile.uri,
      type: selectedFile.type,
      name: selectedFile.name,
    });

    try {
      const response = await fetch('YOUR_UPLOAD_URL', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const result = await response.json();
      console.log('Upload success:', result);
    } catch (error) {
      console.error('Upload error:', error);
    }
    */
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
                {Math.round((selectedFile.size ?? 0) / 1024)} KB
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => setSelectedFile(null)}>
            <Text style={styles.outlineButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={!selectedFile}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
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
    gap: 10,
    width: '100%',
    justifyContent: 'center',
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
