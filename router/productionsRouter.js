const express = require('express');
const router = express.Router();
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
const {
    upload,
    uploadFields
 } = require('../middlewares/files');
// Import controller functions
const {
    createproduct,
    addFavourite,
    myFavourite,
    getPosts,
    getSimilarProductsByCategory,
    filterProducts,
    patchGlobalProperty,
    deleteProductFromFavourite,
    deletePost,
    addFollow,
    deleteFollow,
    updatePrivacy,
    handleUpload,
    searchProducts,
    deleteImage,
    addImagesToPost,
    updatePostText
} = require('../controller/productions');
router.patch('/update-post/:id', updatePostText);
router.delete('/delete-image/:id', deleteImage);
router.post('/add-images/:id', upload.fields(uploadFields), addImagesToPost);
router.post('/follow', addFollow);
router.delete('/follow', deleteFollow);
router.post('/search/:id', searchProducts);
router.post('/create', upload.fields(uploadFields), createproduct);
router.post('/favourite', addFavourite);
router.get('/favourite/:id', myFavourite);
router.get('/posts/:id', getPosts);
router.get('/similar/:userId/:id', getSimilarProductsByCategory);
router.post('/filter/:id', filterProducts);

// Route to update a global property for all products
router.patch('/update-global', patchGlobalProperty);

// Route to remove product from user's favourites
router.delete('/favourite/:userId/:productId', deleteProductFromFavourite);

// Route to delete a product
router.delete('/delete/:id', deletePost);
router.patch('/privacy', updatePrivacy);
module.exports = router;
