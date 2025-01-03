const Production = require('../models/productions/production');
const User = require('../models/users');
const cloudinary = require('../middlewares/cloudinaryConfig');
const favouriteModel = require('../models/favouriteModel');
const multer = require('multer');
const io = require('../server');
// Create Product
const createproduct = async (req, res) => {
    try {
        console.log('Request Body:', req.body);
        console.log('Request Files:', req.files);

        const {
            userId,
            title,
            description,
            location,
            content,
            price,
            condition,
            category,
            gearType,
            fuelType,
            is40W,
            metaCategory,
            carType,
            modelCar,
            special,
            global,
            viewers,
            carDetails,
            landTo,
            spaceLand,
            owner,
            marhon,
            nearTo,
            direction,
            numberOfrooms,
            numberOfbathrooms,
            buildingSpace,
            buildingFloor,
            buildingAge,
            mafrosha
        } = req.body;

        // Validate required fields
        if (!userId || !title || !description || !content) {
            console.error('Missing required fields:', { userId, title, description, content });
            return res.status(400).json({ message: 'userId, title, description, and content are required.' });
        }

        // Handle image uploads with Cloudinary (max 5 images)
        let images = [];
        if (req.files && req.files.length > 0) {
            if (req.files.length > 5) {
                return res.status(400).json({ message: 'You can upload a maximum of 5 images.' });
            }

            const uploadPromises = req.files.map(async (file) => {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: 'productions',
                    resource_type: 'image'
                });
                return result.secure_url;
            });

            images = await Promise.all(uploadPromises);
        }

        const production = new Production({
            userId,
            title,
            description,
            location,
            content,
            price,
            condition,
            category,
            gearType,
            fuelType,
            is40W,
            metaCategory,
            carType,
            modelCar,
            special,
            images,
            global,
            viewers,
            carDetails,
            landTo,
            spaceLand,
            owner,
            marhon,
            nearTo,
            direction,
            numberOfrooms,
            numberOfbathrooms,
            buildingSpace,
            buildingFloor,
            buildingAge,
            mafrosha
        });

        await production.save();
       
        io.emit('new-product', production);
       
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
        const myfavourite = await favouriteModel.find({ userId });
        if (!myfavourite || myfavourite.length === 0) {
            return res.status(200).json({ message: 'No favourite products found.' });
        }
        return res.status(200).json({ favourite: myfavourite });
    } catch (error) {
        console.error('Error fetching favourites:', error);
        return res.status(500).json({ message: 'Failed to retrieve favourites', error: error.message });
    }
};
const getPosts = async (req, res) => {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit; // Skip the number of documents for pagination

    try {
        // Fetch products with global: true, apply pagination, and populate user data
        const products = await Production.find({ global: true })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'username email phoneNumber userFCMToken') // Fetch user details
            .lean(); // Convert Mongoose documents to plain objects

        // Fetch the user's favourite products
        const favourites = await favouriteModel.find({ userId }).select('productId');
        
        // Map favourite product IDs to an array
        const favouriteProductIds = favourites.map(fav => fav.productId.toString());

        // Map over the products and add the `isFavourite` field
        const productsWithUserAndFavouriteStatus = products.map(product => ({
            ...product,
            isFavourite: favouriteProductIds.includes(product._id.toString()),
            user: product.userId // User details populated
        }));

        // Get the total number of products that match the global: true filter for pagination info
        const totalProducts = await Production.countDocuments({ global: true });

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / limit);

        // Return the response with products, user data, and pagination details
        return res.status(200).json({
            products: productsWithUserAndFavouriteStatus,
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
    const userId = req.params.id; // userId from URL parameter
    const productId = req.params.productId; // productId from URL parameter
    const { page = 1, pageSize = 10 } = req.query; // Pagination parameters

    try {
        // Get the current product details
        const product = await Production.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Pagination setup
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);
        const skip = (pageNumber - 1) * limit;

        // Query to find similar products based on the same category
        const query = {
            category: product.category, // Same category
            _id: { $ne: productId } // Exclude the current product
        };

        // Fetch similar products based on the category with pagination
        const similarProducts = await Production.find(query)
            .skip(skip)
            .limit(limit);

        // Fetch the user's favourite products
        const favourites = await favouriteModel.find({ userId }).select('productId');

        // Extract product IDs of the user's favourites
        const favouriteProductIds = favourites.map(fav => fav.productId.toString());

        // Add `isFavourite` field to each similar product
        const productsWithFavouriteStatus = similarProducts.map(product => ({
            ...product.toObject(),
            isFavourite: favouriteProductIds.includes(product._id.toString())
        }));

        // Get the total number of similar products to calculate total pages
        const totalSimilarProducts = await Production.countDocuments(query);

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalSimilarProducts / limit);

        return res.status(200).json({
            products: productsWithFavouriteStatus,
            currentPage: pageNumber,
            totalPages: totalPages,
            totalProducts: totalSimilarProducts,
            pageSize: limit
        });
    } catch (error) {
        console.error('Error fetching similar products:', error);
        return res.status(500).json({
            message: 'Failed to retrieve similar products',
            error: error.message
        });
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
            query.location = filters.location; // Exact match
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
            products: productsWithFavouriteStatus,
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
    deleteProductFromFavourite
};
