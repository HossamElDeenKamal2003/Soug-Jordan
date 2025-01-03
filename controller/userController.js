const User = require('../models/users');
const favouriteModel = require('../models/favouriteModel');
const Post = require('../models/productions/production');
const followModel = require('../models/follow');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const messages = require('../models/messages');
const mongoose = require('mongoose');
const register = async (req, res) => {
    const { email, phoneNumber, password, username, userFCMToken } = req.body;
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or Phone number already exists' });
        }
        const user = new User({
            email,
            phoneNumber,
            password,
            username,
            userFCMToken: userFCMToken || ""
        });
        await user.save();
        res.status(200).json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
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
    const { emailOrPhone, password } = req.body;
    try {
        console.log('Login request data:', { emailOrPhone, password });
        const user = await User.findOne({
            $or: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }]
        });
        if (!user) {
            return res.status(400).json({ message: 'User Not Found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect Password' });
        }
        res.status(200).json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
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

const updatePassword = async function(req, res) {
    const { id, oldPassword, newPassword } = req.body;

    try {
        // Find the user by ID
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare the old password with the stored hashed password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: `Error updating password: ${error.message}` });
    }
}

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
}

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
    deleteFollow
};
