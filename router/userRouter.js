const express = require('express');
const router = express.Router();
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
    deleteFollow
} = require('../controller/userController'); // Ensure file name case matches

router.post('/register', register);
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
module.exports = router;
