const User = require('../models/users');
const favouriteModel = require('../models/favouriteModel');
const Post = require('../models/productions/production');
const followModel = require('../models/follow');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const messages = require('../models/messages');
const mongoose = require('mongoose');
const multer = require('multer');
const upload = require('../middlewares/files');
const {
    sendMessage
} = require('./verifyOtp');
const handleUpload = (req, res, next) => {
  upload.fields([{ name: "profileImage" }, { name: "coverImage" }])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        message: "File upload error",
        error: err.message,
      });
    } else if (err) {
      console.log(err.message);
      return res.status(500).json({
        message: "Error uploading files",
        error: err.message,
      });
    }

    try {
      const uploadedFiles = [];

      // Check if profileImage and coverImage exist
      if (req.files.profileImage) {
        req.files.profileImage.forEach((file) => {
          uploadedFiles.push({
            field: "profileImage",
            originalName: file.originalname,
            s3Url: file.location, // `file.location` contains the S3 URL
          });
        });
      }

      if (req.files.coverImage) {
        req.files.coverImage.forEach((file) => {
          uploadedFiles.push({
            field: "coverImage",
            originalName: file.originalname,
            s3Url: file.location,
          });
        });
      }

      req.uploadedFiles = uploadedFiles;
      next();
    } catch (uploadErr) {
      console.log(uploadErr.message);
      return res.status(500).json({
        message: "Error processing uploaded files",
        error: uploadErr.message,
      });
    }
  });
};


module.exports = handleUpload;

const handleSingleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
          return res.status(400).json({
              message: 'File upload error',
              error: err.message
          });
      } else if (err) {
          return res.status(500).json({
              message: 'Error uploading file',
              error: err.message
          });
      }
      next();
  });
};

function generateRandomOtp(){
    return Math.floor(1000 + Math.random() * 9000);
}

const sendOtp = async (phoneNumber) => {
    try {
        const otp = generateRandomOtp();
        console.log('Generated OTP:', otp, 'Sending to:', phoneNumber);

        const send = await sendMessage(phoneNumber, `Your OTP is: ${otp}`);
        console.log('Send OTP result:', send);
        const updateOtp = await User.findOneAndUpdate(
            { phoneNumber },
            { otp: otp },
            { new: true }
        );
        if(!updateOtp){
            return res.status(400).json({
                message: "Error When Update User Otp"
            })
        }
        return send;
    } catch (err) {
        console.error('Error in sendOtp:', err);
    }
};

const register = async (req, res) => {
    try {
        const { username, email, password, phoneNumber, userFCMToken } = req.body;

        // Validate fields
        if (!username || !email || !password || !phoneNumber) {
            return res.status(400).json({
                message: 'Missing required fields',
                fields: ['username', 'email', 'password', 'phoneNumber'].filter(field => !req.body[field])
            });
        }

        // Normalize phone number
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        if (!normalizedPhoneNumber) {
            return res.status(400).json({
                message: 'Invalid phone number format'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber: normalizedPhoneNumber }] });
        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists with this email or phone number'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Handle file uploads
        const profileImage = req.files?.profileImage ? req.files.profileImage[0].location : '';
        const coverImage = req.files?.coverImage ? req.files.coverImage[0].location : '';

        // Create user
        const user = new User({
            username,
            email,
            profileImage,
            coverImage,
            phoneNumber: normalizedPhoneNumber,
            userFCMToken: userFCMToken || "",
            password: hashedPassword,
            verified: false,
            otp: ""
        });

        await user.save();

        // Send OTP to phone
        await sendOtp(normalizedPhoneNumber);

        return res.status(201).json({
            message: 'User registered successfully. Please verify your OTP.',
            user: user
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return null;

    // Remove all non-digit characters
    const cleanedNumber = phoneNumber.replace(/[^\d]/g, '');

    // Helper function to validate length
    const validateLength = (number, expectedLength) =>
        number.length === expectedLength;

    // Egypt (country code: +20)
    if (cleanedNumber.startsWith('20')) {
        // International format (+20 XXXXXXXXXX)
        if (validateLength(cleanedNumber, 12)) {
            return cleanedNumber;
        }
    } else if (
        // Local formats:
        // 0XXXXXXXXXX (11 digits) or 10XXXXXXXX (10 digits)
        (cleanedNumber.startsWith('0') && validateLength(cleanedNumber, 11)) ||
        (cleanedNumber.startsWith('10') && validateLength(cleanedNumber, 10))
    ) {
        return '20' + cleanedNumber.slice(cleanedNumber.startsWith('0') ? 1 : 2);
    }

    // Jordan (country code: +962)
    if (cleanedNumber.startsWith('962')) {
        // International format (+962 7XXXXXXXX)
        if (validateLength(cleanedNumber, 12) && cleanedNumber[3] === '7') {
            return cleanedNumber;
        }
    } else if (
        // Local formats:
        // 7XXXXXXXX (9 digits) or 07XXXXXXXX (10 digits)
        (cleanedNumber.startsWith('7') && validateLength(cleanedNumber, 9)) ||
        (cleanedNumber.startsWith('07') && validateLength(cleanedNumber, 10))
    ) {
        return '962' + cleanedNumber.slice(cleanedNumber.startsWith('07') ? 1 : 0);
    }

    // Saudi Arabia (country code: +966)
    if (cleanedNumber.startsWith('966')) {
        // International format (+966 5XXXXXXXX)
        if (validateLength(cleanedNumber, 12) && cleanedNumber[3] === '5') {
            return cleanedNumber;
        }
    } else if (
        // Local formats:
        // 5XXXXXXXX (9 digits) or 05XXXXXXXX (10 digits)
        (cleanedNumber.startsWith('5') && validateLength(cleanedNumber, 9)) ||
        (cleanedNumber.startsWith('05') && validateLength(cleanedNumber, 10))
    ) {
        return '966' + cleanedNumber.slice(cleanedNumber.startsWith('05') ? 1 : 0);
    }

    // If none of the patterns match
    return null;
};
// null
// Update profile image
const updateProfileImage = async (req, res) => {
  const { userId } = req.body;

  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No profile image file provided',
      });
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Update the user's profile image
    user.profileImage = req.file.location;

    // Save the updated user
    await user.save();

    // Return success response
    return res.status(200).json({
      message: 'Profile image updated successfully',
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error('Profile image update error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};
// Update cover image
const updateCoverImage = async (req, res) => {
  const { userId } = req.body;

  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No cover image file provided',
      });
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Update the user's cover image
    user.coverImage = req.file.location;

    // Save the updated user
    await user.save();

    // Return success response
    return res.status(200).json({
      message: 'Cover image updated successfully',
      coverImage: user.coverImage,
    });
  } catch (error) {
    console.error('Cover image update error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const updateToken = async function (req, res) {
  const id = req.params.id;
  const { userFCMToken } = req.body;

  if (!id || !userFCMToken) {
      return res.status(400).json({ message: "Invalid ID or Token" });
  }

  try {
      const updatedUser = await User.findOneAndUpdate(
          { _id: id },
          { userFCMToken },
          { new: true }
      );

      if (!updatedUser) {
          return res.status(400).json({ message: "Failed to update userFCMToken" });
      }

      res.status(200).json({ 
          message: "Token updated successfully", 
          updatedToken: updatedUser.userFCMToken 
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
    const { email, password, phoneNumber } = req.body;

    // Validation
    if ((!email && !phoneNumber) || !password) {
        return res.status(400).json({
            message: 'Email or phone number and password are required'
        });
    }

    try {
        // Find user by email or phone number
        const query = {};
        if (email) {
            query.email = email;
        } else {
            query.phoneNumber = normalizePhoneNumber(phoneNumber);
        }

        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is verified
        if (user.verified === false) {
            return res.status(403).json({
                message: 'Account not verified. Please verify your account.'
            });
        }

        // Check if user is blocked
        if (user.block === true) {
            return res.status(403).json({
                message: 'Account blocked. Please contact support.'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token (uncomment when ready)
        // const token = jwt.sign(
        //   { id: user._id, username: user.username },
        //   process.env.JWT_SECRET,
        //   { expiresIn: '1h' }
        // );

        // Prepare user data for response
        const userData = {
            id: user._id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
            coverImage: user.coverImage,
            phoneNumber: user.phoneNumber
        };

        return res.status(200).json({
            message: 'Login successful',
            user: userData,
            // token: token // Include when using JWT
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

const updateEmail = async function(req, res){
  const { id, email } = req.body;
  try{
      const result = await User.findByIdAndUpdate(
          { _id: id },
          { email: email},
          { new: true}
      );
      if(!result){
          res.status(404).json({ message: "Failed to update user email" });
      }
      res.status(200).json({ message: result });
  }
  catch(error){
      console.log(error);
      res.status(500).json({ message: error.message });
  }
}

const updatePhoneNumber = async function(req, res){
  const { id, phoneNumber } = req.body;
  try{
      const result = await User.findByIdAndUpdate(
          { _id: id },
          { phoneNumber: phoneNumber },
          { new: true }
      )
      if(!result){
          res.status(404).json({ message: "Failed to update user phone number" });
      }
      res.status(200).json({ message: result });
  }
  catch(error){
      console.log(error);
      res.status(500).json({ message: error.message });
  }
}


const updatePassword = async (req, res) => {
  const { id, oldPassword, newPassword } = req.body;

  // Validate required fields
  if (!id || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare old password with stored hash
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    // Hash new password using bcrypt
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserById = async function(req, res){
  const id = req.params.id;
  try{
      const user = await User.findOne({ _id: id });
      const postsFavourite = await favouriteModel.find({userId: id});
      const userPosts = await Post.find({userId: id});
      if(!user){
          return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ User: user, favourite: postsFavourite, posts: userPosts });
  }
  catch(error){
      console.log(error);
      res.status(500).json({ Error: error.message });
  }
};

const updateUsername = async function(req, res){
  const { userId, newName } = req.body;
  try{
      const updateUsername = await User.findByIdAndUpdate(
          { _id: userId },
          { username: newName },
          { new: true }
      );
      if(!updateUsername){
          return res.status(400).json({ message: "Failed to update username" });
      }
      res.status(200).json({ message: updateUsername });
  }
  catch(error){
      console.log(error);
      res.status(500).json({ message: error.message }); 
  }
};

const deletUser = async function(req, res){
  const userId = req.params.id;
  try{
      const deletedUser = await User.findOneAndDelete({ _id: userId });
      if(!deletedUser){
          res.status(400).json({message: "Error while delete user"});
      }
      res.status(200).json({message: "User Deleted Successfully", user: deletUser});
  }
  catch(error){
      console.log(error.message);
      res.status(500).json({ message: error.message });
  }
}

const addFollow = async function(req, res) {
  const { userId, postId } = req.body;

  try {
      // Create a new follow document
      const newFollow = new followModel({
          userId,
          postId,
      });

      // Save the document to the database
      await newFollow.save();

      return res.status(201).json({ message: 'Follow added successfully', data: newFollow });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
  }
};

const getFollow = async function (req, res) {
  const userId = req.params.id;

  try {
      // Find all follow documents for the given userId
      const followPosts = await followModel.find({ userId: userId });

      if (!followPosts.length) {
          return res.status(200).json({
              message: "No followed posts found",
              postsFollowed: [],
          });
      }

      // Extract all postId values and ensure they are ObjectIds
      const postIds = followPosts.map(follow => new mongoose.Types.ObjectId(follow.postId));

      // Fetch post data for the corresponding postIds
      const posts = await Post.find({ _id: { $in: postIds } });

      res.status(200).json({
          message: "Followed posts fetched successfully",
          postsFollowed: posts
      });
  } catch (error) {
      console.error("Error fetching followed posts:", error);
      return res.status(500).json({ message: error.message });
  }
};

const deleteFollow = async function(req, res){
  const {userId,postId} = req.body;
  try{
      const deletedPost = await followModel.findOneAndDelete({userId: userId, postId:postId});
      if(!deletedPost){
          return res.status(400).json({message: 'cannot delete post from followed post'});
      }
      res.status(200).json({message: "Post deleted successfully from follow model", deletedPost: deletedPost});
  }
  catch(error){
      console.log(error);
      res.status(500).json({message: error.message});
  }
};


const resetPassword = async function(req, res){
    const {
        phoneNumber,
        otp,
        newPassword
    } = req.body;
    try{
        const userPhoneNumber = normalizePhoneNumber(phoneNumber);

        const user = await User.findOne({ phoneNumber: userPhoneNumber });
        if(!user){
            return res.status(400).json({message: "User not found"});
        }

        if(!otp && !newPassword){
            const send = await sendOtp(userPhoneNumber);
            console.log(send);
            return res.status(200).json({ message: 'OTP Sent To Whatsapp' });
        }else{
            console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$",otp);

            if(otp === user.otp){
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                user.password = hashedPassword;
                user.verified = true;
                await user.save();
                return res.status(200).json({message: 'Your Password Reset Successfully'});
            }else{
                return res.status(400).json({message: 'Otp Not Correct'});
            }
        }
    }catch(error){
        console.log(error);
        res.status(500).json({message: error.message});
    }
}

const verifyOtp = async (req, res) => {
    const { id, otp } = req.body;

    try {
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        if(!otp){
            await sendOtp(user.phoneNumber);
            return res.status(200).json({message: 'Otp Sent To Whatsapp'});
        }
        if(user.otp === otp) {
            user.verified = true;
            user.otp = "";
            await user.save();

            return res.status(200).json({
                message: 'OTP verified successfully',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phoneNumber: user.phoneNumber
                }
            });
        } else {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

module.exports = {
  register,
  login,
  updateEmail,
  updatePhoneNumber,
  updatePassword,
  getUserById,
  updateUsername,
  deletUser,
  updateToken,
  addFollow,
  getFollow,
  deleteFollow,
  updateCoverImage,
  updateProfileImage,
  handleUpload,
  updateCoverImage,
  updateProfileImage,
  handleSingleUpload,
    resetPassword,
    verifyOtp
};
