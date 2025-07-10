const {db} = require('../firebase');
const Service = require('../models/service.model');
const serviceSchema = require('../validators/service.validator');
const collection = db.collection('services');

// CREATE
// const createService = async (req, res) => {
//   try {
//     const { name, category, icon, description } = req.body;
//     const service = new Service(name, category, icon, description);
//     const docRef = await collection.add(service);
//     res.status(201).json({ id: docRef.id, ...service });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

const createService = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = serviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const docRef = await collection.add(value);
    res.status(201).json({ id: docRef.id, ...value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

};

// READ ALL
const getAllServices = async (req, res) => {
  try {
    const snapshot = await collection.get();
    const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
const getServiceById = async (req, res) => {
  try {
    const doc = await collection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Service not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
const updateService = async (req, res) => {
  try {
    const data = req.body;
    await collection.doc(req.params.id).update(data);
    res.json({ message: 'Service updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
const deleteService = async (req, res) => {
  try {
    await collection.doc(req.params.id).delete();
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
};
