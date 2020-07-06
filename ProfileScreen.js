import React, { useState, useEffect } from 'react';
import { 
  StyleSheet,
  View,
  Text,
  StatusBar,
  Keyboard,
} from 'react-native';
import PropTypes from 'prop-types';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { setName, setEmail, setPhotoUrl } from '../Redux/Actions';
import Colors from '../Constants/Colors';
import NavigationHeader from '../Components/NavigationHeader';
import UIText from '../Constants/UIText';
import ProfileHeader from '../Components/ProfileHeader';
import ProfilePicture from '../Components/ProfilePicture';
import useMessageDisplayer from '../Hooks/useMessageDisplayer';
import ImagePicker from 'react-native-image-picker';
import { buildStorageRef } from '../Networking/RefBuilders';
import { uploadPhotoAndRetrieveUrl } from '../Networking/Storage';
import { convertPhotoToBlob } from '../Utilities/Tools';
import EditableTextField from '../Components/EditableTextField';
import { updateUserData } from '../Networking/Firestore';
import CustomKeyboardAvoidingView from '../Components/CustomKeyboardAvoidingView';
import KeyboardDismissor from '../Components/KeyboardDismissor';
import {request, PERMISSIONS} from 'react-native-permissions';
import { updateUserEmail, loginUserIn } from '../Networking/Authentication';
import ReEnterPasswordPopup from '../Components/ReEnterPasswordPopup';
import RegexPatterns from '../Constants/RegexPatterns';
import { getIosCameraAndPhotoLibraryPermissions } from '../Utilities/Permissions';

const imagePickerOptions = {
  storageOptions: {
    skipBackup: true,
    path: 'images',
  },
  maxWidth: 400,
  maxHeight: 400,
};


const ProfileScreen = ({ navigation }) => {
  const {
    language,
    photoUrl,
    uid,
    name,
    email,
    isConnectedToInternet,
  } = useSelector(state => ({
    language: state.language,
    photoUrl: state.photoUrl,
    uid: state.uid,
    name: state.name,
    email: state.email,
    isConnectedToInternet: state.isConnectedToInternet,
  }), shallowEqual);

  const dispatch = useDispatch();

  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [viewBottomOffset, setViewBottomOffset] = useState(0);
  const [showReEnterPasswordPopup, setShowReEnterPasswordPopup] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [unAppliedEmail, setUnAppliedEmail] = useState('');
  const [messageDisplayer, displayMessage] = useMessageDisplayer();

  const showImagePicker = async() => {
    const {
      cameraPermissionGranted,
      photoLibraryPermissionGranted,
    } = await getIosCameraAndPhotoLibraryPermissions();

    if (!cameraPermissionGranted && !photoLibraryPermissionGranted) return;

    ImagePicker.showImagePicker({...imagePickerOptions, title: UIText[language].selectAvatar}, async response => {
      if (response.didCancel || response.error) return;

      if (!isConnectedToInternet) {
        displayMessage(UIText[language].checkInternetConnectionAndTry());
        return;
      }

      setUploadingPicture(true);

      const photoBlob = await convertPhotoToBlob(response.uri);
      const photoRef = buildStorageRef('users', uid);
      const photoUrl = await uploadPhotoAndRetrieveUrl(photoRef, photoBlob);

      setUploadingPicture(false);
      displayMessage(UIText[language].imageUploaded);
      dispatch(setPhotoUrl(photoUrl));
      updateUserData(uid, {photoUrl});
    });
  }

  const applyChange = ({type, value}) => {

    if (!isConnectedToInternet) {
      displayMessage(UIText[language].checkInternetConnectionAndTry());
      return;
    }

    if (type == 'fullName') {
      dispatch(setName(value));
      updateUserData(uid, {name: value});
      displayMessage(UIText[language].changesApplied);
    }
    else if (type == 'email') {
      if (!RegexPatterns.email.test(value)) {
        displayMessage(UIText[language].invalidEmail);
        return;
      }
      setUnAppliedEmail(value);
      setPasswordErrorMessage('');
      Keyboard.dismiss();
      setShowReEnterPasswordPopup(true);
    }
  }

  const changeEmail = async password => {
    if (!password) {
      setPasswordErrorMessage(UIText[language].blankPassword);
      return;
    }

    setPasswordErrorMessage('');
    setChangeEmailLoading(true);

    try {
      const { user } = await loginUserIn(email, password);
      if (!user) throw new Error('User is undefined');
    }
    catch(error) {
      showReEnterPasswordPopup
        ? setPasswordErrorMessage(UIText[language].incorrectPassword)
        : displayMessage(UIText[language].incorrectPassword);
      setChangeEmailLoading(false);
      return;
    }

    setChangeEmailLoading(false);
    setShowReEnterPasswordPopup(false);
    dispatch(setEmail(unAppliedEmail));
    updateUserData(uid, {email: unAppliedEmail});
    updateUserEmail(unAppliedEmail);
    displayMessage(UIText[language].changesApplied);
  }

  return (
    <KeyboardDismissor backgroundColor={Colors.backgroundColor}>
      <CustomKeyboardAvoidingView
        bottomOffset={viewBottomOffset}
        translationDeterminedByOffset
        avoidingIsActive={!showReEnterPasswordPopup}>
          <View style={styles.container}>
            <ProfileHeader>
              <StatusBar translucent barStyle='default' backgroundColor='rgba(0, 0, 0, 0.1)' />

              <NavigationHeader title={UIText[language].myAccount} navigation={navigation} absolute language={language}/>

              <ProfilePicture style={{marginTop: 15}} uri={photoUrl} loading={uploadingPicture} onPress={showImagePicker} />
            </ProfileHeader>

            <View style={styles.accountDetailsTitleContainer}>
              <Text style={[ styles.accountDetailsTitleText, {color: Colors.textColor} ]}>
                {UIText[language].accountDetails}
              </Text>
            </View>

            <EditableTextField
              type='fullName'
              language={language}
              label={UIText[language].fullName}
              value={name}
              onApplyChange={applyChange}
            />

            <EditableTextField
              type='email'
              language={language}
              label={UIText[language].email}
              value={email}
              onApplyChange={applyChange}
              onBottomOffsetDetermined={bottomOffset => setViewBottomOffset(bottomOffset)}     
            />

            {__DEV__ && (
              <Text style={{marginHorizontal: '5%', marginTop: 5, color: Colors.extraFadedTextColor}}>
                UID: {uid.slice(0, 6)}
              </Text>
            )}

            { messageDisplayer }
          </View>
      </CustomKeyboardAvoidingView>

      {showReEnterPasswordPopup && (
        <ReEnterPasswordPopup 
          language={language}
          visible={showReEnterPasswordPopup}
          attemptLoginWithPassword={changeEmail}
          dismiss={() => setShowReEnterPasswordPopup(false)}
          errorMessage={passwordErrorMessage}
          loading={changeEmailLoading}
        />
      )}

    </KeyboardDismissor>
  )
}

const styles = StyleSheet.create({
  container:{
    flex: 1,
    backgroundColor: Colors.backgroundColor,
  },
  accountDetailsTitleContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  accountDetailsTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
  }
});

ProfileScreen.propTypes = {
  navigation: PropTypes.object,
  setName: PropTypes.func,
  setEmail: PropTypes.func,
}

export default ProfileScreen;