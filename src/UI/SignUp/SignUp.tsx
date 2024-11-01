import axios from "axios";
import { gapi } from "gapi-script";
import { useEffect, useState } from "react";
import { GoogleLogin } from "react-google-login";
import VariaMosLogo from "../../Addons/images/VariaMosLogo.png";
import _config from "../../Infraestructure/config.json";
import LanguagePage from "../../core/pages/LanguagesPage";
import {
  CLIENT_ID,
  SignUpKeys,
  SignUpMessages,
  SignUpURLs,
  SignUpUserTypes,
} from "./SignUp.constants";
import "./SignUp.css";

function SignInUp() {
  const [loginProgress, setLoginProgress] = useState(SignUpMessages.Welcome);
  const [hasErrors, setErrors] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const isUserLoggedIn = !!localStorage.getItem(
      SignUpKeys.CurrentUserProfile
    );
    if (isUserLoggedIn) {
      setAuthenticated(true);
    }

    function start() {
      gapi.client.init({
        clientId: CLIENT_ID,
        scope: "email",
      });
    }

    gapi.load("client:auth2", start);
  }, []);

  const signUpAsAGuestHandler = () => {
    const guestProfile = {
      email: null,
      givenName: "Guest",
      userType: SignUpUserTypes.Guest,
    };
    localStorage.setItem(
      SignUpKeys.CurrentUserProfile,
      JSON.stringify(guestProfile)
    );
    setAuthenticated(true);
  };

  const onSuccess = (response) => {
    const userProfile = {
      ...response.profileObj,
      userType: SignUpUserTypes.Registered,
    };
    localStorage.setItem(
      SignUpKeys.CurrentUserProfile,
      JSON.stringify(userProfile)
    );

    setLoginProgress(SignUpMessages.Loading);

    axios
      .post(
        `${
          process.env.REACT_APP_URLBACKENDLANGUAGE || _config.urlBackEndLanguage
        }${SignUpURLs.SignIn}`,
        {
          email: userProfile.email,
          name: userProfile.givenName,
        }
      )
      .then(({ data: responseData }) => {
        const { data } = responseData;
        localStorage.setItem(
          SignUpKeys.DataBaseUserProfile,
          JSON.stringify(data)
        );

        if (response && response.accessToken) {
          setAuthenticated(true);
        }
      })
      .catch((e) => {
        setErrors(true);
        setLoginProgress(SignUpMessages.LoginError);
      });
  };

  const onFailure = (response) => {
    console.log("FAILED", response);
  };

  if (authenticated) {
    return <LanguagePage />;
  }

  return (
    <div className="signup">
      <div className="signup__container shadow-sm rounded">
        <img
          src={VariaMosLogo}
          alt=""
          className="img-fluid"
          width="191"
          height="39"
        />
        <h3
          className={`signup__title text-center ${
            hasErrors ? `signup__error` : `projectName`
          } p-2`}
        >
          {loginProgress}
        </h3>
        <div>
          <GoogleLogin
            clientId={CLIENT_ID}
            onSuccess={onSuccess}
            onFailure={onFailure}
          />
        </div>
        <div className="signup__guest">
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid  */}
          <a
            href="#"
            onClick={signUpAsAGuestHandler}
            className="signup__guest-link"
          >
            {SignUpMessages.ContinueAsGuest}
          </a>
        </div>
      </div>
    </div>
  );
}

export default SignInUp;
