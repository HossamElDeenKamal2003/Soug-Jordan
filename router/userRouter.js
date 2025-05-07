const express = require('express');
const router = express.Router();
// const upload = require('../middlewares/files');
const {
    register,
    login,
    updateEmail,
    updatePhoneNumber,
    updatePassword,
    getUserById,
    updateUsername,
    deletUser, // Correct typo here
    updateToken,
    addFollow,
    getFollow,
    deleteFollow,
    handleUpload,
    updateCoverImage,
    updateProfileImage,
    resetPassword,
    verifyOtp,
    handleSingleUpload
} = require('../controller/userController'); // Ensure file name case matches
const { upload } = require('../middlewares/files');
router.post(
    '/register',
    // handleSingleUpload('coverImage'),
    register
);
router.patch('/update-profile-image',upload.single('profileImage'), updateProfileImage);

// Update Cover Image
router.patch('/update-cover-image', upload.single('coverImage'), updateCoverImage);
router.post('/login', login);
router.patch('/update-email', updateEmail);
router.patch('/update-phone-number', updatePhoneNumber); // Consistent route name
router.patch('/update-password', updatePassword);
router.get('/get-user/:id', getUserById);
router.patch('/update-username', updateUsername);
router.delete('/delete-user/:id', deletUser); // Consistent route name
router.post('/updateToken/:id', updateToken);
router.post('/addFollow', addFollow);
router.get('/getFollow/:id', getFollow);
router.delete('/deleteFollow', deleteFollow);
router.post('/resetPassword', resetPassword);
router.post('/verify', verifyOtp);
module.exports = router;
