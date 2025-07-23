const { db } = require("../firebase");
const { Home, Vehicle } = require("../models/customer.model");
const {
  addHomeSchema,
  addVehicleSchema,
  editHomeSchema,
  editVehicleSchema,
} = require("../validators/customer.validator");
const { v4: uuidv4 } = require("uuid");

const usersCollection = db.collection("users");

// Add new home
const addNewHome = async (req, res) => {
  try {
    const { error, value } = addHomeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    // Check if customer exists
    const customerDoc = await usersCollection.doc(value.customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    // Create home object with unique ID
    const homeData = {
      id: uuidv4(),
      name: value.name,
      address: value.address,
      propertyType: value.propertyType,
      area: value.area,
      type: "home",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Get current customer data
    const customerData = customerDoc.data();
    const currentHomes = customerData.homes || [];

    // Add new home to the homes array
    const updatedHomes = [...currentHomes, homeData];

    // Update customer document with new home
    await usersCollection.doc(value.customerId).update({
      homes: updatedHomes,
      updatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Home added successfully",
      data: homeData,
    });
  } catch (error) {
    console.error("Error adding new home:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while adding home",
    });
  }
};

// Add new vehicle
const addNewVehicle = async (req, res) => {
  try {
    const { error, value } = addVehicleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    // Check if customer exists
    const customerDoc = await usersCollection.doc(value.customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    // Create vehicle object with unique ID
    const vehicleData = {
      id: uuidv4(),
      make: value.make,
      model: value.model,
      year: value.year,
      licensePlate: value.licensePlate,
      vehicleType: value.vehicleType,
      fuelType: value.fuelType,
      type: "vehicle",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Get current customer data
    const customerData = customerDoc.data();
    const currentVehicles = customerData.vehicles || [];

    // Add new vehicle to the vehicles array
    const updatedVehicles = [...currentVehicles, vehicleData];

    // Update customer document with new vehicle
    await usersCollection.doc(value.customerId).update({
      vehicles: updatedVehicles,
      updatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      data: vehicleData,
    });
  } catch (error) {
    console.error("Error adding new vehicle:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while adding vehicle",
    });
  }
};

// Edit home
const EditHome = async (req, res) => {
  try {
    const { id } = req.params; // This is the home ID
    const { customerId } = req.body; // Customer ID should be provided in request body

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Home ID is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "Customer ID is required",
      });
    }

    const { error, value } = editHomeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    // Check if customer exists
    const customerDoc = await usersCollection.doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    const customerData = customerDoc.data();
    const homes = customerData.homes || [];

    // Find the home to update
    const homeIndex = homes.findIndex((home) => home.id === id);
    if (homeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Home not found",
      });
    }

    // Update the home with new data
    const updatedHome = {
      ...homes[homeIndex],
      ...value,
      updatedAt: new Date(),
    };

    // Update the homes array
    const updatedHomes = [...homes];
    updatedHomes[homeIndex] = updatedHome;

    // Update customer document
    await usersCollection.doc(customerId).update({
      homes: updatedHomes,
      updatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Home updated successfully",
      data: updatedHome,
    });
  } catch (error) {
    console.error("Error editing home:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while updating home",
    });
  }
};

// Edit vehicle
const EdtitVehicle = async (req, res) => {
  try {
    const { id } = req.params; // This is the vehicle ID
    const { customerId } = req.body; // Customer ID should be provided in request body

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Vehicle ID is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "Customer ID is required",
      });
    }

    const { error, value } = editVehicleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    // Check if customer exists
    const customerDoc = await usersCollection.doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    const customerData = customerDoc.data();
    const vehicles = customerData.vehicles || [];

    // Find the vehicle to update
    const vehicleIndex = vehicles.findIndex((vehicle) => vehicle.id === id);
    if (vehicleIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    const currentVehicle = vehicles[vehicleIndex];

    // If license plate is being updated, check for duplicates across all customers
    if (
      value.licensePlate &&
      value.licensePlate !== currentVehicle.licensePlate
    ) {
      const allCustomers = await usersCollection.get();
      let licensePlateExists = false;

      allCustomers.forEach((doc) => {
        const customerData = doc.data();
        if (customerData.vehicles) {
          const existingVehicle = customerData.vehicles.find(
            (vehicle) =>
              vehicle.licensePlate === value.licensePlate && vehicle.id !== id
          );
          if (existingVehicle) {
            licensePlateExists = true;
          }
        }
      });

      if (licensePlateExists) {
        return res.status(409).json({
          success: false,
          error: "A vehicle with this license plate already exists",
        });
      }
    }

    // Update the vehicle with new data
    const updatedVehicle = {
      ...currentVehicle,
      ...value,
      updatedAt: new Date(),
    };

    // Update the vehicles array
    const updatedVehicles = [...vehicles];
    updatedVehicles[vehicleIndex] = updatedVehicle;

    // Update customer document
    await usersCollection.doc(customerId).update({
      vehicles: updatedVehicles,
      updatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    });
  } catch (error) {
    console.error("Error editing vehicle:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while updating vehicle",
    });
  }
};

// Remove property (home or vehicle)
const RemoveProperty = async (req, res) => {
  try {
    const { id } = req.params; // This is the property ID (home or vehicle)
    const { customerId, type } = req.body; // Customer ID and property type should be provided

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Property ID is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "Customer ID is required",
      });
    }

    if (!type || (type !== "home" && type !== "vehicle")) {
      return res.status(400).json({
        success: false,
        error:
          'Property type is required and must be either "home" or "vehicle"',
      });
    }

    // Check if customer exists
    const customerDoc = await usersCollection.doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    const customerData = customerDoc.data();
    let propertyFound = false;
    let propertyName = "";
    let updateData = {};

    if (type === "home") {
      const homes = customerData.homes || [];
      const homeIndex = homes.findIndex((home) => home.id === id);

      if (homeIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Home not found",
        });
      }

      propertyFound = true;
      propertyName = homes[homeIndex].name;
      const updatedHomes = homes.filter((home) => home.id !== id);

      updateData = {
        homes: updatedHomes,
        updatedAt: new Date(),
      };
    } else if (type === "vehicle") {
      const vehicles = customerData.vehicles || [];
      const vehicleIndex = vehicles.findIndex((vehicle) => vehicle.id === id);

      if (vehicleIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Vehicle not found",
        });
      }

      propertyFound = true;
      propertyName = `${vehicles[vehicleIndex].make} ${vehicles[vehicleIndex].model}`;
      const updatedVehicles = vehicles.filter((vehicle) => vehicle.id !== id);

      updateData = {
        vehicles: updatedVehicles,
        updatedAt: new Date(),
      };
    }

    // Update customer document
    await usersCollection.doc(customerId).update(updateData);

    return res.status(200).json({
      success: true,
      message: `${type === "home" ? "Home" : "Vehicle"} removed successfully`,
      data: {
        id: id,
        type: type,
        name: propertyName,
      },
    });
  } catch (error) {
    console.error("Error removing property:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while removing property",
    });
  }
};

module.exports = {
  addNewHome,
  addNewVehicle,
  EditHome,
  EdtitVehicle,
  RemoveProperty,
};
