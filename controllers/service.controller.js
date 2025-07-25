const { db } = require('../firebase');

//Model
const Appointment = require('../models/scAppointment.model');

//Schema
const { appointmentSchema, serviceSchema, calendarTaskSchema } = require('../validators/service.validator');

// Collections
const appointmentsCollection = db.collection('appointments');
const tasksCollection = db.collection('calendar_tasks');
const servicesCollection = db.collection('services');

// ========== APPOINTMENTS ==========

// Add Appointment
const addAppointment = async (req, res) => {
  try {

    const { error, value } = appointmentSchema.validate(req.body);
    if(error) return res.status(400).json({ success:false, error: error.details[0].message });

    const newAppointment = new Appointment(value);
    const docRef = await appointmentsCollection.add(newAppointment);

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
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    await appointmentsCollection.doc(id).update(updateData);
    res.json({ success: true, message: 'Appointment updated successfully', data: updateData });
  } catch (err) {
    console.error('Edit appointment error:', err);
    res.status(500).json({ success: false, error: 'Failed to update appointment' });
  }
};

// Delete Appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    await appointmentsCollection.doc(id).delete();
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
    const { id } = req.params;

    if(!id) {
      return res.status(400).json({ success:false, error:'Missing ServiceCenterID' });
    }

    const doc = await appointmentsCollection.doc(id).get();
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
    const newTask = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

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
    await tasksCollection.doc(id).update(updateData);
    res.json({ success: true, message: 'Task updated successfully' });
  } catch (err) {
    console.error('Edit task error:', err);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
};

// Delete Task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await tasksCollection.doc(id).delete();
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
};

// View All Tasks
const viewAllTasks = async (req, res) => {
  try {
    const snapshot = await tasksCollection.get();
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
    const { date } = req.params;
    await tasksCollection.doc(date).get();
    res.json({ success: true, message: 'Task Get by Date' });
  } catch (err) {
    console.error('Get Task by Date is error:', err);
    res.status(500).json({ success: false, error: 'Failed to task get' });
  }
}

// View Appointments in Calendar View (grouped or filtered by date)
const viewAppointmentsInCalendar = async (req, res) => {
  try {
    const snapshot = await appointmentsCollection.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const grouped = data.reduce((acc, item) => {
      const date = item.date?.split('T')[0];
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
  try {
    const newService = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await servicesCollection.add(newService);
    res.status(201).json({ success: true, message: 'Service added successfully', id: docRef.id });
  } catch (err) {
    console.error('Add service error:', err);
    res.status(500).json({ success: false, error: 'Failed to add service' });
  }
};

// Edit Service
const editService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    await servicesCollection.doc(id).update(updateData);
    res.json({ success: true, message: 'Service updated successfully' });
  } catch (err) {
    console.error('Edit service error:', err);
    res.status(500).json({ success: false, error: 'Failed to update service' });
  }
};

// Delete Service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await servicesCollection.doc(id).delete();
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete service' });
  }
};

// View All Services
const viewAllServices = async (req, res) => {
  try {
    const snapshot = await servicesCollection.get();
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
    const { id } = req.params;

    if(!id) {
      return res.status(400).json({ success:false, error:'Missing Service Id' });
    }

    const doc = await servicesCollection.doc(id).get();
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
  viewServiceById
};
