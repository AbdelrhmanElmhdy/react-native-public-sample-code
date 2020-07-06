import React, { useState } from 'react';
import { 
  StyleSheet,
  View,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { setUserData, setLanguage, setLanguageIsSetManually } from '../Redux/Actions';
import Colors from '../Constants/Colors';
import NavigationHeader from '../Components/NavigationHeader';
import UIText from '../Constants/UIText';
import FullWidthButton from '../Components/FullWidthButton';
import initialState from '../Redux/InitialState';
import { deleteUserDoc } from '../Networking/Firestore';
import useLogout from '../Hooks/useLogout';
import DismissibleModal from '../Components/DismissibleModal';
import CustomIcon from '../Components/CustomIcon';
import { IONICONS } from '../Constants/IconFamilies';

const isIos = Platform.OS === 'ios';

const SettingsScreen = ({ navigation }) => {

  const { language, deviceLanguage, uid, loggedIn } = useSelector(state => ({
    language: state.language,
    deviceLanguage: state.deviceLanguage,
    uid: state.uid,
    loggedIn: state.loggedIn,
  }), shallowEqual);

  const dispatch = useDispatch();

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const logout = useLogout();
  
  const onPressLogout = async() => {
    setShowLogoutPopup(false);
    logout();
    navigation.goBack();
  }

  const deleteUserAndLogout = () => {
    if (!__DEV__) return;
    deleteUserDoc(uid);
    dispatch(setUserData(initialState));
    onPressLogout();
	}

  const onSelectLanguage = languageArg => {
    if (languageArg !== deviceLanguage)
      dispatch(setLanguageIsSetManually(true));
    else
      dispatch(setLanguageIsSetManually(false));

    dispatch(setLanguage(languageArg));
  }

  const navigateToHelp = () => {
    navigation.navigate('Help');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent barStyle='default' backgroundColor='rgba(0, 0, 0, 0.1)' />

      <NavigationHeader
        title={UIText[language].settings}
        navigation={navigation}
        noneTranslucent
        borderShown
        language={language}
      />

      <View style={styles.btnsContainer}>
        {(__DEV__ || isIos) && (
          <FullWidthButton
            textStyle={{color: Colors.tintColor}}
            onLongPress={deleteUserAndLogout}
            buttonName={UIText[language].language}
            language={language}
            onChangeDropDownValue={onSelectLanguage}
            dropdownData={[
              {value: 'en', label: UIText[language].english},
              {value: 'ar', label: UIText[language].arabic},
            ]}
            containerStyle={{flexDirection: language === 'ar' && isIos ? 'row-reverse' : 'row', direction: 'ltr'}}
          />
        )}

        <FullWidthButton
          onPress={navigateToHelp}
          buttonName={UIText[language].help}
          iconName='ios-help-circle'
        />

        {loggedIn && (
          <FullWidthButton
            containerStyle={{borderBottomWidth: 0}}
            textStyle={{color: Colors.red}}
            onPress={() => setShowLogoutPopup(true)}
            onLongPress={deleteUserAndLogout}
            buttonName={UIText[language].logout}
            iconName='ios-log-out'
            language={language}
          />
        )}
      </View>

      <DismissibleModal
        visible={showLogoutPopup}
        okayBtnLabel={UIText[language].logout}
        okayBtnColor={Colors.red}
        cancelBtnLabel={UIText[language].cancel}
        onPressOk={onPressLogout}
        dismiss={() => setShowLogoutPopup(false)}
        style={{width: '80%'}}
        includeCancelBtn>
          <CustomIcon
            name='ios-log-out'
            iconFamily={IONICONS}
            size={35}
            color={Colors.tintColor}
            style={styles.popupIcon}
          />

          <View style={styles.popupLabelContainer}>
            <Text style={styles.popupLabel}>
              {UIText[language].confirmLogout}
            </Text>
          </View>
      </DismissibleModal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:{
    flex: 1,
    backgroundColor: Colors.secondaryBackgroundColor,
  },
  btnsContainer: {
    flex: 1,
    paddingTop: 60,
  },
  popupIcon: {
    alignSelf: 'center',
    marginTop: 10,
  },
  popupLabelContainer: {
    width: '100%',
    paddingHorizontal: 8,
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 10,
  },
  popupLabel: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.grayTextColor,
  },
});

export default SettingsScreen;