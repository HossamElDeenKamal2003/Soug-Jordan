const Production = require('../models/productions/production');
const User = require('../models/users');
const cloudinary = require('../middlewares/cloudinaryConfig');
const favouriteModel = require('../models/favouriteModel');
const followModel = require("../models/follow");
const multer = require('multer');
const io = require('../server');
const productsAr = require('../models/productions/productsAr');
// Create Product
const upload = require('../middlewares/files');
const handleUpload = (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        return res.status(500).json({
          message: 'Error uploading files',
          error: err.message
        });
      }
      next();
    });
  };
  const createproduct = async (req, res) => {
    try {
      // Log request data for debugging
      console.log('Request Body:', req.body);
      console.log('Uploaded Files:', req.files);
  
      // Parse form data values and convert strings to appropriate types
      const formData = {
        ...req.body,
        price: req.body.price ? parseFloat(req.body.price) : undefined,
        numberOfrooms: req.body.numberOfrooms ? parseInt(req.body.numberOfrooms) : undefined,
        numberOfbathrooms: req.body.numberOfbathrooms ? parseInt(req.body.numberOfbathrooms) : undefined,
        buildingSpace: req.body.buildingSpace ? parseFloat(req.body.buildingSpace) : undefined,
        buildingFloor: req.body.buildingFloor ? parseInt(req.body.buildingFloor) : undefined,
        buildingAge: req.body.buildingAge ? parseInt(req.body.buildingAge) : undefined,
        is40W: req.body.is40W === 'true',
        global: req.body.global === 'true',
        mafrosha: req.body.mafrosha === 'true',
        special: req.body.special === 'true',
        ArLocation: req.body.ArLocation || undefined,
        metaCategory: req.body.metaCategory || undefined,
        ArmetaLocation: req.body.ArmetaLocation || undefined,
          floorOption: req.body.floorOption || undefined,
          arDetails: req.body.arDetails || undefined,
          buildingArea: req.body.buildingArea ? parseFloat(req.body.buildingArea) : undefined,
          landArea: req.body.landArea ? parseFloat(req.body.landArea) : undefined,
          unit: req.body.unit || undefined,
          mileage: req.body.mileage ? parseFloat(req.body.mileage) : (
              req.body.millage ? parseFloat(req.body.millage) : undefined
          ),
          nearTo: req.body.nearTo ? JSON.parse(req.body.nearTo) : [],

      };
        // Validate required fields
      const requiredFields = ['userId', 'title', 'description', 'content'];
      const missingFields = requiredFields.filter(field => !formData[field] || String(formData[field]).trim() === '');
  
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Missing required fields',
          fields: missingFields,
        });
      }
  
      // Extract image URLs from uploaded files in parallel
      const images = [];
      if (req.files) {
        // Create an array of promises for image uploads
        const uploadPromises = Object.keys(req.files).map(async (fieldName) => {
          const file = req.files[fieldName][0];
          images.push(file.location); // Push the image URL to the images array
        });
  
        // Wait for all uploads to complete
        await Promise.all(uploadPromises);
      }
  
      // Create product object with all possible fields
      const productData = {
        userId: formData.userId,
        adNumber: formData.adNumber,
        mileage: formData.mileage,
        carRate: formData.carRate,
        saleState: formData.saleState,
        title: String(formData.title).trim(),
        description: String(formData.description).trim(),
        location: formData.location,
        content: String(formData.content).trim(),
        price: formData.price,
        condition: formData.condition,
        category: formData.category,
        gearType: formData.gearType,
        fuelType: formData.fuelType,
        is40W: formData.is40W,
        metaCategory: formData.metaCategory,
        carType: formData.carType,
        modelCar: formData.modelCar,
        special: formData.special,
        images,
        global: true,
        viewers: formData.viewers,
        carDetails: formData.carDetails,
        landTo: formData.landTo,
        spaceLand: formData.spaceLand,
        owner: formData.owner,
        marhon: formData.marhon,
        nearTo: formData.nearTo,
        direction: formData.direction,
        numberOfrooms: formData.numberOfrooms,
        numberOfbathrooms: formData.numberOfbathrooms,
        buildingSpace: formData.buildingSpace,
        buildingFloor: formData.buildingFloor,
        buildingAge: formData.buildingAge,
        mafrosha: formData.mafrosha,
        ArLocation: formData.ArLocation,
        metaLocation: formData.metaLocation,
        ArmetaLocation: formData.ArmetaLocation,
          metaLocation: formData.metaLocation,
          unit: formData.unit,
          floorOption: formData.floorOption,
          arDetails: formData.arDetails,
          buildingArea: formData.buildingArea,
          landArea: formData.landArea,
      };
  
      // Create and save the product
      const product = new Production(productData);
      await product.save();
  
      // Populate the userId field for the response
      const populatedProduct = await Production.findById(product._id).populate('userId', 'username email phoneNumber userFCMToken');
  
      // Emit real-time update if socket.io is configured
      if (io) {
        io.emit('new-product', { product: populatedProduct });
      }

      // Return success response
      res.status(201).json({
        message: 'Product created successfully',
        data: populatedProduct,
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message,
      });
    }
  };

// Add to Favourite
const addFavourite = async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const existingFav = await favouriteModel.findOne({ userId, productId });
        if (existingFav) {
            return res.status(400).json({ message: 'Product already in favourites.' });
        }

        const newFav = new favouriteModel({ userId, productId });
        await newFav.save();

        return res.status(200).json({ message: 'Added successfully to favourites.' });
    } catch (error) {
        console.error('Error adding to favourites:', error);
        return res.status(500).json({ message: 'Failed to add to favourites', error: error.message });
    }
};

// Get User Favourites
const myFavourite = async (req, res) => {
    const userId = req.params.id;
    try {
        const myfavourite = await favouriteModel.find({ userId }).populate('productId');
        if (!myfavourite || myfavourite.length === 0) {
            return res.status(200).json({ message: 'No favourite products found.' });
        }
        return res.status(200).json({ favourite: myfavourite.reverse() });
    } catch (error) {
        console.error('Error fetching favourites:', error);
        return res.status(500).json({ message: 'Failed to retrieve favourites', error: error.message });
    }
};
const getPosts = async (req, res) => {
    let userId = req.params.id;
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit; // Skip the number of documents for pagination

    try {
        if (userId === 'null' || !userId) {
            userId = "6762162e2be4997bad6b8237";
        }

        // Fetch products with global: true, apply pagination, and populate user data
        // Fetch products with global: true, apply pagination, and populate user data, sorted in descending order
        const products = await Production.find({ global: true })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email phoneNumber userFCMToken') // Populate user details
        .sort({ _id: -1 })  // Sort by _id in descending order
        .lean(); // Lean to return plain objects

        // Fetch the user's favourite products
        const favourites = await favouriteModel.find({ userId }).select('productId');

        // Map favourite product IDs to an array
        const favouriteProductIds = favourites.map(fav => fav.productId.toString());

        // Add `isFavourite`, `isFollow`, and `isSeen` fields to products
        const productsWithStatus = await Promise.all(products.map(async product => {
            const isFollow = await followModel.exists({ userId, postId: product._id });
            const isSeen = userId !== "6762162e2be4997bad6b8237" && product.viewers?.includes(userId);

            return {
                ...product,
                isFavourite: favouriteProductIds.includes(product._id.toString()), // Check if the product is a favourite
                isFollow: !!isFollow, // Check if the user follows the post
                isSeen: !!isSeen, // Ensure isSeen is a boolean
            };
        }));

        // Get the total number of products that match the global: true filter for pagination info
        const totalProducts = await Production.countDocuments({ global: true });

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / limit);

        // Return the response with products, user data, and pagination details
        return res.status(200).json({
            products: productsWithStatus,
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts,
            pageSize: limit
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ message: 'Failed to retrieve products', error: error.message });
    }
};

const getSimilarProductsByCategory = async (req, res) => {
    const id = req.params.id; // Post ID
    let userId = req.params.userId; // Use 'let' instead of 'const'

    try {
        console.log("product id", id);
        console.log("user id", userId);

        if (id === 'null') {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if userId is 'null' and assign a default value
        if (userId === 'null' || !userId) {
            userId = "6762162e2be4997bad6b8237";
        }

        const post = await Production.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        let isFavourite = false;
        let isFollow = false;
        let isSeen = false;

        // Update the viewers array if userId is not already present
        if (userId !== "6762162e2be4997bad6b8237") {
            post.viewers.push(userId);
            const updatePost = await post.save();
                if(!updatePost){
                    console.log("Failed to update post");
                }
        }

        if (userId && userId !== 'null') {
            // Check if user is a viewer and update `isSeen`
            isSeen = post.viewers.includes(userId);

            if (!post.viewers.includes(userId)) {
                post.viewers.push(userId);
                await post.save();
            }

            // Check if the user has favorited or followed the post
            isFavourite = !!(await favouriteModel.exists({ userId, productId: id }));
            isFollow = !!(await followModel.exists({ userId, postId: id }));
        }

        const user = await User.findById(post.userId).select('email username phoneNumber');

        const similarPosts = await Production.find({
            metaCategory: post.metaCategory,
            _id: { $ne: id }
        }).limit(10);

        res.status(200).json({
            post: {
                ...post._doc,
                isFollow,
                isFavourite,
                isSeen // Add the `isSeen` property to the response
            },
            user: user || null,
            similar: similarPosts
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Failed to fetch data', error: error.message });
    }
};

const searchProducts = async (req, res) => {
    const userId = req.params.id;
    const { query: searchQuery } = req.body; // Search query from the request body
    const { page = 1, pageSize = 10 } = req.query; // Pagination parameters

    try {
        // Convert pagination parameters to integers
        const pageNumber = parseInt(page, 10);
        const limit = parseInt(pageSize, 10);

        // Calculate skip for pagination
        const skip = (pageNumber - 1) * limit;

        // Build the search query
        const query = {};
        if (searchQuery) {
            const regex = new RegExp(searchQuery, 'i'); // Case-insensitive search
            query.$or = [
                { title: regex },
                { description: regex },
                { location: regex },
                { category: regex },
                { gearType: regex },
                { fuelType: regex },
                { carType: regex },
                { modelCar: regex },
                { metaCategory: regex },
                { condition: regex },
                { special: regex },
                { carDetails: regex },
                { landTo: regex },
                { spaceLand: regex },
                { owner: regex },
                { marhon: regex },
                { nearTo: regex },
                { direction: regex },
                { numberOfrooms: regex },
                { numberOfbathrooms: regex },
                { buildingSpace: regex },
                { buildingFloor: regex },
                { buildingAge: regex },
                { mafrosha: regex },
                // { price: searchQuery }, // Numeric fields should match as-is
                // Add additional fields if necessary
            ];
        }

        // Fetch the filtered products with pagination
        const products = await Production
            .find(query)
            .skip(skip)
            .populate('userId', 'username email phoneNumber userFCMToken') // Fetch user details
            .limit(limit);

        // Fetch the favourite products of the user
        const favourites = await favouriteModel.find({ userId }).select('productId');

        // Extract the product IDs from the favourites
        const favouriteProductIds = favourites.map((fav) => fav.productId.toString());

        // Add `isFavourite` field to each product
        const productsWithFavouriteStatus = products.map((product) => ({
            ...product.toObject(),
            isFavourite: favouriteProductIds.includes(product._id.toString()),
        }));

        // Get the total number of products that match the filters to calculate total pages
        const totalProducts = await Production.countDocuments(query);

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / limit);

        return res.status(200).json({
            products: productsWithFavouriteStatus,
            currentPage: pageNumber,
            totalPages: totalPages,
            totalProducts: totalProducts,
            pageSize: limit,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};


const filterProducts = async (req, res) => {
    const userId = req.params.id; // userId from the URL parameter
    const filters = req.body; // Filters passed in the request body
    const { page = 1, pageSize = 10 } = req.query; // Pagination parameters

    try {
        // Convert pagination parameters to integers
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);

        // Validate pagination parameters
        if (isNaN(pageNumber) || isNaN(limit) || pageNumber < 1 || limit < 1) {
            return res.status(400).json({ message: 'Invalid pagination parameters' });
        }

        // Calculate skip for pagination
        const skip = (pageNumber - 1) * limit;

        // Build the query dynamically based on the filters provided
        const query = buildQuery(filters);

        // Fetch the filtered products with pagination
        const products = await Production.find(query)
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .populate('userId', 'username email phoneNumber userFCMToken')
            .limit(limit);

        // Fetch the favourite products of the user
        const favourites = await favouriteModel.find({ userId }).select('productId');

        // Extract the product IDs from the favourites
        const favouriteProductIds = favourites
            .filter(fav => fav.productId) // Ensure productId exists
            .map(fav => fav.productId.toString());

        // Add `isFavourite` field to each product
        const productsWithFavouriteStatus = products.map(product => ({
            ...product.toObject(),
            isFavourite: favouriteProductIds.includes(product._id.toString()),
        }));

        // Get the total number of products that match the filters to calculate total pages
        const totalProducts = await Production.countDocuments(query);

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / limit);

        return res.status(200).json({
            products: productsWithFavouriteStatus,
            currentPage: pageNumber,
            totalPages: totalPages,
            totalProducts: totalProducts,
            pageSize: limit,
        });
    } catch (error) {
        console.error('Error fetching filtered products:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Invalid input', error: error.message });
        }
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Helper function to build the query dynamically
const buildQuery = (filters) => {
    const query = {};

    // Dynamically add filters to the query object
    const filterMappings = {
        category: (value) => ({ category: value }),
        price: (value) => ({ price: { $gte: value.min, $lte: value.max } }),
        location: (value) => ({ location: { $regex: value, $options: 'i' } }),
        condition: (value) => ({ condition: value }),
        carType: (value) => ({ carType: value }),
        modelCar: (value) => ({ modelCar: { $regex: value, $options: 'i' } }),
        metaCategory: (value) => ({ metaCategory: { $regex: value, $options: 'i' } }),
        gearType: (value) => ({ gearType: value }),
        fuelType: (value) => ({ fuelType: value }),
        is40W: (value) => ({ is40W: value }),
        global: (value) => ({ global: value }),
        viewers: (value) => ({ viewers: { $gte: value } }),
        owner: (value) => ({ owner: value }),
        numberOfrooms: (value) => ({ numberOfrooms: value }),
        numberOfbathrooms: (value) => ({ numberOfbathrooms: value }),
        buildingSpace: (value) => ({ buildingSpace: { $gte: value } }),
        buildingFloor: (value) => ({ buildingFloor: value }),
        buildingAge: (value) => ({ buildingAge: value }),
        metaLocation: (value) => ({ metaLocation: value }),
        containImages: (value) => (value ? { images: { $exists: true, $ne: [] } } : {}),
    };

    // Apply filters dynamically
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
            const filterFunction = filterMappings[key];
            if (filterFunction) {
                Object.assign(query, filterFunction(value));
            }
        }
    }

    return query;
};
const patchGlobalProperty = async (req, res) => {
    const { property, value } = req.body; // property name and its new value

    try {
        // Update the specified global property for all products
        const updatedProducts = await Production.updateMany(
            {}, // Update all products
            { $set: { [property]: value } } // Update the specific property with the given value
        );

        return res.status(200).json({
            message: 'Global property updated successfully',
            updatedCount: updatedProducts.nModified // Number of updated products
        });
    } catch (error) {
        console.error('Error updating global property:', error);
        return res.status(500).json({ message: 'Failed to update global property', error: error.message });
    }
};
const deleteProductFromFavourite = async (req, res) => {
    const { userId, productId } = req.params;

    try {
        // Find and remove the product from the user's favourites
        const favourite = await favouriteModel.findOneAndDelete({ userId, productId });

        if (!favourite) {
            return res.status(404).json({ message: 'Product not found in favourites' });
        }

        return res.status(200).json({ message: 'Product removed from favourites successfully' });
    } catch (error) {
        console.error('Error removing product from favourites:', error);
        return res.status(500).json({ message: 'Failed to remove product from favourites', error: error.message });
    }
};
const deletePost = async (req, res) => {
    const productId = req.params.id;

    try {
        // Find and delete the product by ID
        const product = await Production.findByIdAndDelete(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
};

const addFollow = async (req, res)=>{
    const { userId, postId } = req.body;
    try{
        const newFollow = new followModel({ userId, postId });
        await newFollow.save();
        if(!newFollow){
            return res.status(400).json({ message: "Failed to follow" });
        }
        res.status(200).json({ message: "Followed successfully", follow: newFollow });
    }
    catch(error){
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}
const deleteFollow = async (req, res)=>{
    const { userId, postId } = req.body;
    try{
        const deletedFollow = await followModel.findOneAndDelete({ userId, postId });
        if(!deletedFollow){
            return res.status(400).json({ message: "Failed to delete follow" });
        }
        res.status(200).json({ message: "Follow deleted successfully", follow: deletedFollow });
    }
    catch(error){
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};

const updatePrivacy = async (req, res) => {
    const { userId, postId } = req.body;
    try {
        // Find the post to check if it belongs to the given userId
        const post = await Production.findOne({ _id: postId });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if the userId from the request matches the userId of the post
        if (post.userId.toString() !== userId) {
            return res.status(401).json({ message: "You are not authorized to update this post's privacy" });
        }

        // Toggle the `global` field value
        const updatedPrivacy = await Production.findByIdAndUpdate(
            postId,
            { global: !post.global }, // Toggle the global value
            { new: true }
        );

        if (!updatedPrivacy) {
            return res.status(400).json({ message: "Failed to update privacy" });
        }

        res.status(200).json({ message: "Privacy updated successfully", post: updatedPrivacy });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};

const updatePostText = async (req, res) => {
    const { id } = req.params; // Corrected this line
    const updates = req.body;
    try {
        const updatePost = await Production.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        );
        if (!updatePost) {
            return res.status(400).json({ message: "Failed To Update Product" });
        }
        return res.status(200).json({ message: "Post Updated Successfully", post: updatePost });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
};

require('dotenv').config();

const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});
const s3 = new AWS.S3();
const deleteImage = async (req, res) => {
    const { id: postId } = req.params; // Destructure postId from URL parameters
    const { index } = req.body; // Get the index of the image to delete from the request body
  
    try {
      // Find the post by ID
      const post = await Production.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      // Validate the image index
      if (index < 0 || index >= post.images.length) {
        return res.status(400).json({ message: 'Invalid image index' });
      }
  
      // Get the image URL to delete from S3
      const imageUrl = post.images[index];
  
      // Extract the S3 object key from the URL
      const urlParts = imageUrl.split('/');
      const key = urlParts.slice(3).join('/'); // Extract the key correctly from the URL
  
      // Delete the image from S3
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME, // Your S3 bucket name
        Key: key, // The key of the object to delete
      };
      await s3.deleteObject(params).promise();
  
      // Remove the image from the post's images array
      post.images.splice(index, 1);
  
      // Save the updated post
      await post.save();
  
      res.status(200).json({ message: 'Image deleted successfully', post });
    } catch (error) {
      console.error('Error deleting image:', error.message);
      res.status(500).json({ message: 'Failed to delete image', error: error.message });
    }
  };

  const addImagesToPost = async (req, res) => {
    const { id: postId } = req.params; // Destructure postId from URL parameters
    const images = req.files; // Get the uploaded files from req.files
  
    console.log('Uploaded Files:', images); // Log the uploaded files for debugging
  
    try {
      // Validate if files were uploaded
      if (!images || Object.keys(images).length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
  
      // Find the post by ID
      const post = await Production.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      // Extract image URLs from uploaded files
      const imageLocations = [];
      for (const fieldName in images) {
        if (images[fieldName]) {
          images[fieldName].forEach(file => {
            imageLocations.push(file.location); // Assuming file.location contains the S3 URL
          });
        }
      }
  
      // Add the new image URLs to the post's images array
      post.images.push(...imageLocations); // Spread to push each location individually
  
      // Save the updated post
      await post.save();
  
      res.status(200).json({ message: 'Images added successfully', post });
    } catch (error) {
      console.error('Error adding images:', error.message);
      res.status(500).json({ message: 'Failed to add images', error: error.message });
    }
  };
// Export Controllers
module.exports = {
    createproduct,
    addFavourite,
    myFavourite,
    getPosts,
    getSimilarProductsByCategory,
    filterProducts,
    deletePost,
    patchGlobalProperty,
    deleteProductFromFavourite,
    addFollow,
    deleteFollow,
    updatePrivacy,
    handleUpload,
    searchProducts,
    updatePostText,
    deleteImage,
    addImagesToPost
};
