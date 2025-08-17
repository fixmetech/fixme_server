const { db } = require('../firebase');

//Model
const Appointment = require('../models/scAppointment.model');
const Service = require('../models/scService.model');
const CalendarTask = require('../models/calendartask.model');
const ServiceCenter = require('../models/service.model');

//Schema
const { appointmentSchema, serviceSchema, calendarTaskSchema , serviceCenterSchema} = require('../validators/service.validator');

// Collections
const appointmentsCollection = db.collection('appointments');
const tasksCollection = db.collection('calendar_tasks');
const servicesCollection = db.collection('services');
const serviceCenterCollection = db.collection('serviceCenters');

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
    const { id } = req.params;

    if(!id) {
      return res.status(400).json({ success:false, error:'Service Cener Id is Missing from the front end request' });
    }

    const doc = await serviceCenterCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Service center not found' });
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get service Center by ID error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch Service Center' });
  }
}

//Service Center Profile
const editProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = serviceCenterSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const updatedProfile = new ServiceCenter(value);
    const plainProfile = JSON.parse(JSON.stringify(updatedProfile));

    await serviceCenterCollection.doc(id).update(plainProfile);
    res.json({ success: true, message: 'Profile updated successfully', data: value });
  } catch (err) {
    console.error('Edit Profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to edit profile' });
  }
};

//APPOINTMENTS

// Add Appointment
const addAppointment = async (req, res) => {
  try {

    const { error, value } = appointmentSchema.validate(req.body);
    if(error) return res.status(400).json({ success:false, error: error.details[0].message });

    if (!value.servicecenterid) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const newAppointment = new Appointment(value);
    const plainAppointment = JSON.parse(JSON.stringify(newAppointment));
    const docRef = await appointmentsCollection.add(plainAppointment);

    res.status(201).json({
      success: true,
      message: 'Appointment added successfully',
      id: { id: docRef.id, ...newAppointment }
    });
  } catch (err) {
    console.error('Add appointment error:', err);
    res.status(500).json({ success: false, error: 'Failed to add appointment' });
  }
};

// Edit Appointment
const editAppointment = async (req, res) => {
  try {
    const { servicecenterid,  id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const { error, value } = appointmentSchema.validate(updateData);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    //check appointment using each service centers
    const appointmentRef = db.collection('serviceCenters').doc(servicecenterid).collection('appointments').doc(id);

    //check if the appointment exists
    const doc = await appointmentRef.get();
    if(!doc.exists) {
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

    const appointmentRef = serviceCenterCollection.doc(servicecenterid).collection('appointments').doc(id);
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
    const { servicecenterid } = req.params;

    if(servicecenterid) {
      return res.status(400).json({ success: false, error: 'Service Center Id not found' });
    }

    const snapshot = await servicesCollection.doc(servicecenterid).collection('appointmets').get();
    
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
    const { error, value } = calendarTaskSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    if (!value.servicecenterid) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const newTask = new CalendarTask({
      ...value,
      createdAt: new Date(),
      updatedAt: new Date()
    });

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
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const { error, value } = calendarTaskSchema.validate(updateData);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    //check task using each service centers
    const taskRef = db.collection('serviceCenters').doc(servicecenterid).collection('task').doc(id);

    //check if the task exists
    const doc = await taskRef.get();
    if(!doc.exists) {
      return res.status(404).json({ success: false, error: 'Task not found' });
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

    if(!servicecenterid) {
      return res.status(400).json({ success: false, error: 'Missing service center id'});
    }

    const snapshot = await db.collection('serviceCenters').doc(servicecenterid).collection('tasks').get();

    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('View tasks error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
};

// View Task By Date
const ViewTaskByDate = async (req, res) => {
  try {
    const { servicecenterid, date } = req.params;

    if( !servicecenterid || !id) {
      res.status(400).json({ success: false, error: 'Failed to find the service center id or date' });
    }

    const snapshot = await db.collection('serviceCenters').doc(servicecenterid).collection('tasks').where('date', '==', date).get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No tasks found for the given date' });
    }

    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data, message: 'Task Get by Date' });
  } catch (err) {
    console.error('Get Task by Date is error:', err);
    res.status(500).json({ success: false, error: 'Failed to task get' });
  }
}

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

//view service by id
const viewServiceById = async (req, res) => {
  try {
    const { servicecenterid, id } = req.params;

    if(!servicecenterid || !id) {
      return res.status(400).json({ success:false, error:'Missing Service Id or service center id' });
    }

    const doc = await db.collection('serviceCenters').doc(servicecenterid).collection('services').get(id);
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get service by ID error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch Service' });
  }
};

module.exports = {
  viewAllServiceCenters,
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
  deleteProfile
};
