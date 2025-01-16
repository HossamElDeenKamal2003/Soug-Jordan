const Production = require('../models/productions/production');
const User = require('../models/users');
const cloudinary = require('../middlewares/cloudinaryConfig');
const favouriteModel = require('../models/favouriteModel');
const followModel = require("../models/follow");
const multer = require('multer');
const io = require('../server');
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
        mileage: req.body.mileage ? parseFloat(req.body.mileage) : undefined,
        numberOfrooms: req.body.numberOfrooms ? parseInt(req.body.numberOfrooms) : undefined,
        numberOfbathrooms: req.body.numberOfbathrooms ? parseInt(req.body.numberOfbathrooms) : undefined,
        buildingSpace: req.body.buildingSpace ? parseFloat(req.body.buildingSpace) : undefined,
        buildingFloor: req.body.buildingFloor ? parseInt(req.body.buildingFloor) : undefined,
        buildingAge: req.body.buildingAge ? parseInt(req.body.buildingAge) : undefined,
        is40W: req.body.is40W === 'true',
        global: req.body.global === 'true',
        mafrosha: req.body.mafrosha === 'true',
        special: req.body.special === 'true',
      };
  
      // Validate required fields
      const requiredFields = ['userId', 'title', 'description', 'content'];
      const missingFields = requiredFields.filter(field => !formData[field] || String(formData[field]).trim() === '');
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Missing required fields',
          fields: missingFields
        });
      }
  
      // Extract image URLs from uploaded files
      const images = req.files ? req.files.map(file => file.location) : [];
  
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
        global: formData.global,
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
      };
  
      // Create and save the product
      const production = new Production(productData);
      await production.save();
  
      // Emit real-time update if socket.io is configured
      if (req.app.get('io')) {
        req.app.get('io').emit('new-product', production);
      }
  
      // Return success response
      return res.status(201).json({
        message: 'Product created successfully',
        data: production
      });
  
    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
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
        const products = await Production.find({ global: true })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'username email phoneNumber userFCMToken') // Populate user details
            .lean(); // Convert Mongoose documents to plain objects

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
            products: productsWithStatus.reverse(),
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
            products: productsWithFavouriteStatus.reverse(),
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

        // Calculate skip for pagination
        const skip = (pageNumber - 1) * limit;

        // Build the query dynamically based on the filters provided
        const query = {};

        // Dynamically add filters to the query object
        if (filters.category) {
            query.category = filters.category;
        }
        if (filters.price) {
            query.price = { $gte: filters.price.min, $lte: filters.price.max };
        }
        if (filters.location) {
            query.location = { $regex: filters.location, $options: 'i' };
        }
        if (filters.condition) {
            query.condition = filters.condition;
        }
        if (filters.carType) {
            query.carType = filters.carType;
        }
        if (filters.modelCar) {
            query.modelCar = filters.modelCar; // Exact match
        }
        if (filters.metaCategory) {
            query.metaCategory = filters.metaCategory; // Exact match
        }
        if (filters.gearType) {
            query.gearType = filters.gearType;
        }
        if (filters.fuelType) {
            query.fuelType = filters.fuelType;
        }
        if (filters.is40W !== undefined) {
            query.is40W = filters.is40W;
        }
        if (filters.global !== undefined) {
            query.global = filters.global;
        }
        if (filters.viewers !== undefined) {
            query.viewers = { $gte: filters.viewers };
        }
        if (filters.owner) {
            query.owner = filters.owner; // Exact match
        }
        if (filters.numberOfrooms !== undefined) {
            query.numberOfrooms = filters.numberOfrooms;
        }
        if(filters.containImages === true){
            query.images = { $exists: true, $ne: [] };
        }
        if (filters.numberOfbathrooms !== undefined) {
            query.numberOfbathrooms = filters.numberOfbathrooms;
        }
        if (filters.buildingSpace !== undefined) {
            query.buildingSpace = { $gte: filters.buildingSpace };
        }
        if (filters.buildingFloor !== undefined) {
            query.buildingFloor = filters.buildingFloor;
        }
        if (filters.buildingAge !== undefined) {
            query.buildingAge = filters.buildingAge;
        }

        // Fetch the filtered products with pagination
        const products = await Production.find(query)
            .skip(skip)
            .populate('userId', 'username email phoneNumber userFCMToken') // Fetch user details
            .limit(limit);

        // Fetch the favourite products of the user
        const favourites = await favouriteModel.find({ userId }).select('productId');

        // Extract the product IDs from the favourites
        const favouriteProductIds = favourites.map(fav => fav.productId.toString());

        // Add `isFavourite` field to each product
        const productsWithFavouriteStatus = products.map(product => ({
            ...product.toObject(),
            isFavourite: favouriteProductIds.includes(product._id.toString())
        }));

        // Get the total number of products that match the filters to calculate total pages
        const totalProducts = await Production.countDocuments(query);

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / limit);

        return res.status(200).json({
            products: productsWithFavouriteStatus.reverse(),
            currentPage: pageNumber,
            totalPages: totalPages,
            totalProducts: totalProducts,
            pageSize: limit
        });
    } catch (error) {
        console.error('Error fetching filtered products:', error);
        return res.status(500).json({
            message: 'Failed to retrieve filtered products',
            error: error.message
        });
    }
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
    searchProducts
};
