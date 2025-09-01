const { db } = require('../firebase');
const admin = require('firebase-admin');

//Model
const Appointment = require('../models/scAppointment.model');
const Service = require('../models/scService.model');
const CalendarTask = require('../models/calendartask.model');
const ServiceCenter = require('../models/service.model');
const Feedback = require('../models/scFeedback.model');

//Schema
const { appointmentSchema, serviceSchema, calendarTaskSchema , serviceCenterSchema, FeedbackSchema} = require('../validators/service.validator');

// Collections
const appointmentsCollection = db.collection('appointments');
const tasksCollection = db.collection('calendartasks');
const servicesCollection = db.collection('services');
const serviceCenterCollection = db.collection('serviceCenters');
const feedbackCollection = db.collection('scfeedbacks');

// Get unique old customers from appointments
const OldCustomers = async (req, res) => {
  try {
    const snapshot = await appointmentsCollection.get();

    if (snapshot.empty) {
      return res.json({ success: true, customers: [] });
    }

    const uniqueCustomers = new Map();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const { email, customerName, phoneNumber } = data;

      if (email) {
        // Use email as a unique key
        uniqueCustomers.set(email, {
          id: doc.id,
          customerName,
          email,
          phoneNumber,
        });
      }
    });

    res.json({
      success: true,
      customers: Array.from(uniqueCustomers.values()),
    });
  } catch (error) {
    console.error("Error fetching old customers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


//get all service center details
const viewAllServiceCenters = async (req, res) => {
  try {
    const snapshot = await serviceCenterCollection.get();
    const serviceCenters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json(serviceCenters);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch service centers",
      error: error.message
    });
  }
};

//Service Centers

// Add Service Center Profile
const addProfile = async (req, res) => {
  try {
    const { error, value } = serviceCenterSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const newProfile = new ServiceCenter({
      ...value,
      createdAt: new Date()
    });

    //convert class instance to plain object before saving
    const plainProfile = JSON.parse(JSON.stringify(newProfile));

    const docRef = await serviceCenterCollection.add(plainProfile);
    res.status(201).json({
      success: true,
      message: 'Service center profile added successfully',
      id: docRef.id
    });
  } catch (err) {
    console.error('Add profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to add service center profile' });
  }
};

// Delete Service Center Profile
const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing profile ID' });
    }

    await serviceCenterCollection.doc(id).delete();
    res.json({ success: true, message: 'Service center profile deleted successfully' });
  } catch (err) {
    console.error('Delete profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete profile' });
  }
};


//Get the each id service Center Details
const getProfileById = async (req, res) => {
  try {
    const { servicecenterid } = req.params;

    if(!servicecenterid) {
      res.status(400).json({ success: false, error: 'Failed to find service center' });
    }

    const docRef = serviceCenterCollection.doc(servicecenterid);
    const doc = await docRef.get();

    console.log("men Service Center ID:", servicecenterid);
    
    if(!doc.exists) {
      return res.status(404).json({ success: false, error: 'No service center found' });
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });

  } catch (err) {
    console.error('View Serivice Center Details error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch service Center Profile' });
  }
}

//Service Center Profile
const editProfile = async (req, res) => {
  try {
    const { servicecenterid } = req.params; // <-- use the route param

    if (!servicecenterid) {
      return res.status(400).json({ success: false, error: 'Service Center ID is required' });
    }

    // Validate the incoming profile data
    const { error, value } = serviceCenterSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const updatedProfile = JSON.parse(JSON.stringify(value)); // convert to plain object

    const docRef = serviceCenterCollection.doc(servicecenterid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Service center not found' });
    }

    await docRef.update(updatedProfile);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (err) {
    console.error('Edit Profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to edit profile' });
  }
};


//APPOINTMENTS
// Add Appointment
const addAppointment = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = appointmentSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, error: error.details[0].message });

    // Check required fields
    if (!value.servicecenterid) {
      return res
        .status(400)
        .json({ success: false, error: 'Service center ID is required.' });
    }
    if (!value.userid) {
      return res
        .status(400)
        .json({ success: false, error: 'Customer UID is required.' });
    }
    if (!value.serviceid) {
      return res
        .status(400)
        .json({ success: false, error: 'Service ID is required.' });
    }

    // Check if appointment already exists for same customer/service/date/time
    const existing = await appointmentsCollection
      .where('userid', '==', value.userid)
      .where('serviceid', '==', value.serviceid)
      .where('servicecenterid', '==', value.servicecenterid)
      .where('date', '==', value.date)
      .where('time', '==', value.time)
      .get();

    if (!existing.empty) {
      return res.status(400).json({
        success: false,
        error:
          'This customer already has an appointment for this service at this time.',
      });
    }

    // Create new appointment
    const newAppointment = new Appointment(value);
    const plainAppointment = JSON.parse(JSON.stringify(newAppointment));

    const docRef = await appointmentsCollection.add({
      ...plainAppointment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      success: true,
      message: 'Appointment added successfully',
      appointment: { id: docRef.id, ...plainAppointment },
    });
  } catch (err) {
    console.error('Add appointment error:', err);
    res
      .status(500)
      .json({ success: false, error: 'Failed to add appointment' });
  }
};


const editAppointment = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;
    console.log(servicecenterid);
    const updateData = { ...req.body, updatedAt: new Date() };

    const { error, value } = appointmentSchema.validate(updateData);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const appointmentRef = appointmentsCollection.doc(id);
    const doc = await appointmentRef.get();

    if (!doc.exists || doc.data().servicecenterid !== servicecenterid) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    await appointmentRef.update(value);
    res.json({ success: true, message: 'Appointment updated successfully', data: value });

  } catch (err) {
    console.error('Edit appointment error:', err);
    res.status(500).json({ success: false, error: 'Failed to update appointment' });
  }
};

// Delete Appointment
const deleteAppointment = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;

    const appointmentRef = serviceCenterCollection
      .doc(servicecenterid)
      .collection('appointments')
      .doc(id);

    const docSnap = await appointmentRef.get();

    console.log(docSnap);

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    await appointmentRef.delete();

    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Delete appointment error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete appointment' });
  }
};


// View All Appointments
const viewAllAppointments = async (req, res) => {
  try {

    const snapshot = await appointmentsCollection.get();
    
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('View appointments error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
};

// View Appointment By ID
const viewAppointmentById = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;

    if(!servicecenterid || !id) {
      return res.status(400).json({ success:false, error:'Missing ServiceCenterID or appointment id' });
    }

    const docRef = db.collection('serviceCenters').doc(servicecenterid).collection('appointments').doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get appointment by ID error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch appointment' });
  }
};

// ========== CALENDAR TASKS ==========

// Add Task to Calendar
const addTask = async (req, res) => {
  try {
    const servicecenterid = req.params.servicecenterid;
    const dataToValidate = { ...req.body, servicecenterid };

    const { error, value } = calendarTaskSchema.validate(dataToValidate);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    // Firestore compatible object
    const newTask = { ...value, createdAt: new Date(), updatedAt: new Date() };

    const docRef = await tasksCollection.add(newTask);
    res.status(201).json({ success: true, message: 'Task added successfully', id: docRef.id });
  } catch (err) {
    console.error('Add task error:', err);
    res.status(500).json({ success: false, error: 'Failed to add task' });
  }
};


// Edit Task
const editTask = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params; // now extracting both
    const updateData = { ...req.body, updatedAt: new Date(), servicecenterid };

    const { error, value } = calendarTaskSchema.validate(updateData);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    //use the same root collection as addTask
    const taskRef = tasksCollection.doc(id);
    const doc = await taskRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // ensure task belongs to the same service center
    if (doc.data().servicecenterid !== servicecenterid) {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit this task' });
    }

    await taskRef.update(value);
    res.json({ success: true, message: 'Task updated successfully', data: value });

  } catch (err) {
    console.error('Edit task error:', err);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
};

// Delete Task
const deleteTask = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;

    const taskRef = serviceCenterCollection.doc(servicecenterid).collection('tasks').doc(id);
    await taskRef.delete();

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
};

// View All Tasks
const viewAllTasks = async (req, res) => {
  try {
    const { servicecenterid } = req.params;

    if (!servicecenterid) {
      return res.status(400).json({ success: false, error: 'Missing service center id' });
    }

    // Get only tasks related to this service center
    const snapshot = await tasksCollection
      .where("servicecenterid", "==", servicecenterid)
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, data: [] });
    }

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('View tasks error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
};

// View Task By Date
const ViewTaskByDate = async (req, res) => {
  try {
    const { servicecenterid } = req.params;
    const { date } = req.query;   // Correct place for ?date=2025-08-25

    if (!servicecenterid || !date) {
      return res.status(400).json({ success: false, error: 'Service center id or date missing' });
    }

    const snapshot = await db
      .collection('serviceCenters')
      .doc(servicecenterid)
      .collection('tasks')
      .where('date', '==', date)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No tasks found for the given date' });
    }

    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data, message: 'Tasks retrieved by date' });
  } catch (err) {
    console.error('Get Task by Date error:', err);
    res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
};


// View Appointments in Calendar View (grouped or filtered by date)
const viewAppointmentsInCalendar = async (req, res) => {
  try {
    const { servicecenterid } = req.params;

    if (!servicecenterid) {
      return res.status(400).json({ success: false, error: 'Missing service center ID' });
    }

    const snapshot = await db.collection('serviceCenters').doc(servicecenterid).collection('appointments').get();

    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const grouped = data.reduce((acc, item) => {
      const date = item.date?.split('T')[0];
      if(!date) return acc;

      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
    res.json({ success: true, data: grouped });
  } catch (err) {
    console.error('View appointments in calendar error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar data' });
  }
};

// ========== SERVICES ==========

// Add Service
const addService = async (req, res) => {
  let tags = [];
  if (req.body.tags) {
    if (Array.isArray(req.body.tags)) {
      tags = req.body.tags;
    } else if (typeof req.body.tags === "string") {
      try {
        tags = JSON.parse(req.body.tags);
        if (!Array.isArray(tags)) {
          tags = req.body.tags.split(",").map(tag => tag.trim());
        }
      } catch {
        tags = req.body.tags.split(",").map(tag => tag.trim());
      }
    }
  }

  try {
    const data = {
      serviceName: req.body.serviceName,
      serviceCategory: req.body.serviceCategory,
      price: Number(req.body.price),   // Convert string to number
      duration: Number(req.body.duration),
      description: req.body.description,
      tags,   //  use parsed tags here
      servicecenterid: req.body.servicecenterid,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
    };

    const { error, value } = serviceSchema.validate(data);

    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    if (!value.servicecenterid) {
      return res.status(400).json({ success: false, error: "Service center ID is required" });
    }

    const newService = new Service({
      ...value,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const plainService = JSON.parse(JSON.stringify(newService));
    console.log(plainService);

    const docRef = await servicesCollection.add(plainService);
    res.status(201).json({ success: true, message: "Service added successfully", id: docRef.id });

  } catch (err) {
    console.error("Add service error:", err);
    res.status(500).json({ success: false, error: "Failed to add service" });
  }
};



// Edit Service
const editService = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const { error, value } = serviceSchema.validate(updateData);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    // get service document by id
    const ServiceRef = servicesCollection.doc(id);
    const doc = await ServiceRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    // check if this service belongs to the servicecenterid
    if (doc.data().servicecenterid !== servicecenterid) {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit this service' });
    }

    await ServiceRef.update(value);

    res.json({ success: true, message: 'Service updated successfully', data: value });

  } catch (err) {
    console.error('Edit service error:', err);
    res.status(500).json({ success: false, error: 'Failed to update service' });
  }
};

// Delete Service
const deleteService = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;

    const serviceRef = servicesCollection.doc(id);
    const doc = await serviceRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    // check if this service belongs to the servicecenterid
    if (doc.data().servicecenterid !== servicecenterid) {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit this service' });
    }

    await serviceRef.delete();

    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete service' });
  }
};

// View All Services
const viewAllServices = async (req, res) => {
  try {
    const { servicecenterid } = req.params;

    if(!servicecenterid) {
      res.status(400).json({ success: false, error: 'Failed to find service center' });
    }

    const snapshot = await db.collection('services').where('servicecenterid', '==', servicecenterid).get();

    console.log("Service Center ID:", servicecenterid);
    console.log("Number of docs:", snapshot.size);

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No services found' });
    }

    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data });

  } catch (err) {
    console.error('View services error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
};

// view service by id and check servicecenterid
const viewServiceById = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;

    if (!servicecenterid || !id) {
      return res.status(400).json({ success: false, error: 'Missing Service Id or Service Center Id' });
    }

    const doc = await servicesCollection.doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const service = { id: doc.id, ...doc.data() };

    if (service.servicecenterid !== servicecenterid) {
      return res.status(403).json({ success: false, error: 'Service does not belong to this service center' });
    }

    res.json({ success: true, data: service });
  } catch (err) {
    console.error('Get service by ID error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch Service' });
  }
};

// view all feedback 
// View All Feedbacks with Customer + Service Info
const viewAllFeedbacks = async (req, res) => {
  try {
    const snapshot = await feedbackCollection.get();

    if (snapshot.empty) {
      return res.json({ success: true, data: [] });
    }

    // Collect all customerIds & serviceIds
    const feedbackDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const customerIds = [...new Set(feedbackDocs.map(fb => fb.customerid))];
    const serviceIds = [...new Set(feedbackDocs.map(fb => fb.serviceid))];

    // --- Fetch Customers ---
    const customersMap = new Map();
    if (customerIds.length > 0) {
      const customerSnapshots = await Promise.all(
        customerIds.map(id => db.collection('users').doc(id).get())
      );

      customerSnapshots.forEach(snap => {
        if (snap.exists) {
          const { firstName, lastName, phone } = snap.data();
          customersMap.set(snap.id, { firstName, lastName, phone });
        }
      });
    }

    // --- Fetch Services ---
    const servicesMap = new Map();
    if (serviceIds.length > 0) {
      const serviceSnapshots = await Promise.all(
        serviceIds.map(id => db.collection('services').doc(id).get())
      );

      serviceSnapshots.forEach(snap => {
        if (snap.exists) {
          const { serviceName } = snap.data();
          servicesMap.set(snap.id, { serviceName });
        }
      });
    }

    // --- Combine Feedback with Customer + Service ---
    const enrichedFeedbacks = feedbackDocs.map(fb => {
      const customer = customersMap.get(fb.customerid) || {};
      const service = servicesMap.get(fb.serviceid) || {};

      return {
        ...fb,
        customer: {
          id: fb.customerid,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phone: customer.phone || '',
        },
        service: {
          id: fb.serviceid,
          serviceName: service.serviceName || '',
        },
      };
    });

    console.log('feedba',enrichedFeedbacks);

    res.json({ success: true, data: enrichedFeedbacks });

  } catch (err) {
    console.error('View feedbacks error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch feedbacks' });
  }
};

// Reply or update reply for feedback
const replyFeedback = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params; // feedback id
    const { replymessage, customerid } = req.body;

    if (!servicecenterid || !id || !customerid || !replymessage) {
      return res.status(400).json({
        success: false,
        error: 'Service center ID, Feedback ID, Customer ID, and Reply are required'
      });
    }

    const feedbackRef = feedbackCollection.doc(id);
    const doc = await feedbackRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    const feedbackData = doc.data();

    // Validate ownership
    if (feedbackData.servicecenterid !== servicecenterid) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Service Center ID' });
    }

    if (feedbackData.customerid !== customerid) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Customer ID' });
    }

    // Update reply (either first reply or edit)
    await feedbackRef.update({
      replymessage,
      repliedAt: new Date()
    });

    res.json({
      success: true,
      message: feedbackData.replymessage ? 'Reply updated successfully' : 'Reply added successfully',
      data: { replymessage, repliedAt: new Date() }
    });
  } catch (err) {
    console.error('Reply error:', err);
    res.status(500).json({ success: false, error: 'Failed to send reply' });
  }
};


module.exports = {
  viewAllServiceCenters,
  replyFeedback,
  addAppointment,
  editAppointment,
  deleteAppointment,
  viewAllAppointments,
  viewAppointmentById,
  addTask,
  editTask,
  deleteTask,
  viewAllTasks,
  ViewTaskByDate,
  viewAppointmentsInCalendar,
  addService,
  editService,
  deleteService,
  viewAllServices,
  viewServiceById,
  editProfile,
  getProfileById,
  addProfile,
  deleteProfile,
  OldCustomers,
  viewAllFeedbacks
};
