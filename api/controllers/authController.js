const AWS = require("aws-sdk");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const validator = require("validator");

const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const adminUser = require("../models/adminUser");


const authController = {
  
  signIn: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const hashed = await bcrypt.hash(password, 10);


      // Find user in MongoDB using cognitoId
      const user = await adminUser.findOne({ email : email, userType : 'admin'}); // Gets all users
      if (!user) {
        return res
          .status(400)
          .json({ message: "Email is invalid." });
      }


      if (!(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Password is invalid.' });
      }
    

   
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email,
          userType: user.userType,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.EXPIRE_IN }
      );

      return res.json({
        token,
        message: "Logged in successfully",
      });
    } catch (error) {
      console.error("Error during sign-in:", error);

      if (error.code === "NotAuthorizedException") {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      return res.status(500).json({ message: "Internal server error", error });
    }
  },

  signOut: async (req, res) => {
    try {
      res.clearCookie("accessToken", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
      });

      res.clearCookie("refreshToken", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
      });

      return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error during sign-out:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      console.log(email);

      // Check if user exists in Cognito
      const params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID_WEB,
        Username: email,
      };

      try {
        await cognito.adminGetUser(params).promise(); // Ensure user exists
      } catch (err) {
        if (err.code === "UserNotFoundException") {
          return res.status(404).json({ message: "User not found in Cognito" });
        }
        console.error("Error checking user in Cognito:", err);
        return res
          .status(500)
          .json({ message: "Error checking user status in Cognito." });
      }

      // Send a password reset code to the user using Cognito's forgotPassword API
      const resetParams = {
        ClientId: process.env.COGNITO_CLIENT_ID_WEB,
        Username: email,
      };

      if (process.env.COGNITO_CLIENT_SECRET_WEB) {
        resetParams.SecretHash = getSecretHash(email);
      }

      await cognito.forgotPassword(resetParams).promise();

      // Success
      return res.status(200).json({
        message:
          "Password reset code sent to your email. Please check your inbox.",
      });
    } catch (error) {
      console.error("Error during forgotPassword:", error);
      return res.status(500).json({
        message: "Error during password reset process",
        error: error.message,
      });
    }
  },

  verifyOtp: async (req, res) => {
    try {
      const { email, otp, password: newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res
          .status(400)
          .json({ message: "Email, OTP, and new password are required." });
      }

      const params = {
        ClientId: process.env.COGNITO_CLIENT_ID_WEB,
        Username: email,
        SecretHash: getSecretHash(email),
        ConfirmationCode: String(otp).trim(), // Ensure OTP is a string
        Password: newPassword,
      };

      await cognitoo.send(new ConfirmForgotPasswordCommand(params));

      res
        .status(200)
        .json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res
        .status(500)
        .json({ message: "Error resetting password.", error: error.message });
    }
  },
  updatePassword: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (typeof email !== "string" || !validator.isEmail(email)) {
        return res
          .status(400)
          .json({ status: 0, message: "Invalid email format" });
      }

      if (!password) {
        return res.status(400).json({ message: "Invalid password" });
      }

      const getdata = await WebUser.findOne({ email: email });

      if (!getdata) {
        return res.status(404).json({ message: "User not found" });
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await WebUser.updateOne(
          { email: cleanEmail },
          { $set: { password: hashedPassword } }
        );
        res.status(200).json({ message: "Password updated successfully" });
      }
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({
        message: "Error updating password",
      });
    }
  },

  

 

  getLocationdata: async (req, res) => {
    try {
      const placeId = req.query.placeid;
      const apiKey = GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&key=${apiKey}`;

      const response = await axios.get(url);
      const extractAddressDetails = (geoLocationResp) => {
        const addressResp = {
          address: "",
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
          lat: geoLocationResp.geometry.location.lat,
          long: geoLocationResp.geometry.location.lng,
        };

        const address_components = geoLocationResp.address_components || [];

        address_components.forEach((component) => {
          const types = component.types;

          if (types.includes("route")) {
            addressResp.street = component.long_name;
          }
          if (types.includes("locality")) {
            addressResp.city = component.long_name;
          }
          if (types.includes("administrative_area_level_1")) {
            addressResp.state = component.short_name;
          }
          if (types.includes("postal_code")) {
            addressResp.zipCode = component.long_name;
          }
          if (types.includes("country")) {
            addressResp.country = component.long_name;
          }
        });

        return addressResp;
      };
      const data = extractAddressDetails(response.data.result);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
function getSecretHash(email) {
  const clientId = process.env.COGNITO_CLIENT_ID_WEB;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET_WEB;

  return crypto
    .createHmac("SHA256", clientSecret)
    .update(email + clientId)
    .digest("base64");
}

module.exports = authController;
