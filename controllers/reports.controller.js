const { db } = require('../firebase');
const emailService = require('../services/email.service');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs-extra');
const path = require('path');

const technicianCollection = db.collection('technicians');
const complaintsCollection = db.collection('complaints');
const bookingsCollection = db.collection('bookings');

// Ensure reports directory exists
const REPORTS_DIR = path.join(__dirname, '..', 'generated_reports');
fs.ensureDirSync(REPORTS_DIR);

class ReportsController {
  // In-memory storage for report metadata (in production, use database)
  static reportStorage = new Map();

  // Generate Registration Analytics Report
  static async getRegistrationAnalytics(req, res) {
    try {
      const { dateRange = '30d', startDate, endDate } = req.query;

      // Calculate date filters
      let fromDate = new Date();
      let toDate = new Date();

      if (startDate && endDate) {
        fromDate = new Date(startDate);
        toDate = new Date(endDate);
      } else {
        // Default date ranges
        switch (dateRange) {
          case '7d':
            fromDate.setDate(fromDate.getDate() - 7);
            break;
          case '30d':
            fromDate.setDate(fromDate.getDate() - 30);
            break;
          case '90d':
            fromDate.setDate(fromDate.getDate() - 90);
            break;
          case '1y':
            fromDate.setFullYear(fromDate.getFullYear() - 1);
            break;
          default:
            fromDate.setDate(fromDate.getDate() - 30);
        }
      }

      // Get all technician registrations within date range
      const registrationsSnapshot = await technicianCollection
        .where('registeredAt', '>=', fromDate)
        .where('registeredAt', '<=', toDate)
        .orderBy('registeredAt', 'desc')
        .get();

      const registrations = [];
      registrationsSnapshot.forEach(doc => {
        const data = doc.data();
        registrations.push({
          id: doc.id,
          ...data,
          registeredAt: data.registeredAt?.toDate ? data.registeredAt.toDate() : (data.registeredAt ? new Date(data.registeredAt) : null),
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : (data.approvedAt ? new Date(data.approvedAt) : null),
          rejectedAt: data.rejectedAt?.toDate ? data.rejectedAt.toDate() : (data.rejectedAt ? new Date(data.rejectedAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
        });
      });

      // Calculate analytics
      const totalRegistrations = registrations.length;
      const approvedRegistrations = registrations.filter(r => r.status === 'approved').length;
      const rejectedRegistrations = registrations.filter(r => r.status === 'rejected').length;
      const pendingRegistrations = registrations.filter(r => r.status === 'pending').length;
      
      const approvalRate = totalRegistrations > 0 ? ((approvedRegistrations / totalRegistrations) * 100).toFixed(2) : 0;
      const rejectionRate = totalRegistrations > 0 ? ((rejectedRegistrations / totalRegistrations) * 100).toFixed(2) : 0;

      // Badge type distribution
      const badgeDistribution = {
        professional: registrations.filter(r => r.badgeType === 'professional').length,
        experience: registrations.filter(r => r.badgeType === 'experience').length,
        probation: registrations.filter(r => r.badgeType === 'probation').length
      };

      // Service category distribution
      const serviceCategoryDistribution = {};
      registrations.forEach(reg => {
        const category = reg.serviceCategory || 'Unknown';
        serviceCategoryDistribution[category] = (serviceCategoryDistribution[category] || 0) + 1;
      });

      // Monthly registration trends
      const monthlyTrends = {};
      registrations.forEach(reg => {
        if (reg.registeredAt) {
          const monthKey = `${reg.registeredAt.getFullYear()}-${String(reg.registeredAt.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyTrends[monthKey]) {
            monthlyTrends[monthKey] = { total: 0, approved: 0, rejected: 0, pending: 0 };
          }
          monthlyTrends[monthKey].total++;
          monthlyTrends[monthKey][reg.status]++;
        }
      });

      // Average processing time (for approved/rejected applications)
      const processedApplications = registrations.filter(r => 
        r.status === 'approved' || r.status === 'rejected'
      );
      
      let averageProcessingTime = 0;
      if (processedApplications.length > 0) {
        const totalProcessingTime = processedApplications.reduce((sum, reg) => {
          const processedDate = reg.status === 'approved' ? reg.approvedAt : reg.rejectedAt;
          if (processedDate && reg.registeredAt) {
            return sum + (processedDate.getTime() - reg.registeredAt.getTime());
          }
          return sum;
        }, 0);
        averageProcessingTime = Math.round(totalProcessingTime / processedApplications.length / (1000 * 60 * 60 * 24)); // in days
      }

      const analyticsData = {
        summary: {
          totalRegistrations,
          approvedRegistrations,
          rejectedRegistrations,
          pendingRegistrations,
          approvalRate: parseFloat(approvalRate),
          rejectionRate: parseFloat(rejectionRate),
          averageProcessingTimeDays: averageProcessingTime
        },
        badgeDistribution,
        serviceCategoryDistribution,
        monthlyTrends: Object.keys(monthlyTrends)
          .sort()
          .map(month => ({
            month,
            ...monthlyTrends[month]
          })),
        recentRegistrations: registrations.slice(0, 10), // Last 10 registrations
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        }
      };

      res.json({
        success: true,
        message: 'Registration analytics generated successfully',
        data: analyticsData
      });

    } catch (error) {
      console.error('Error generating registration analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate registration analytics',
        error: error.message
      });
    }
  }

  // Generate Complaint Summary Report
  static async getComplaintSummaryReport(req, res) {
    try {
      const { dateRange = '30d', startDate, endDate, severity, status } = req.query;

      // Calculate date filters
      let fromDate = new Date();
      let toDate = new Date();

      if (startDate && endDate) {
        fromDate = new Date(startDate);
        toDate = new Date(endDate);
      } else {
        // Default date ranges
        switch (dateRange) {
          case '7d':
            fromDate.setDate(fromDate.getDate() - 7);
            break;
          case '30d':
            fromDate.setDate(fromDate.getDate() - 30);
            break;
          case '90d':
            fromDate.setDate(fromDate.getDate() - 90);
            break;
          case '1y':
            fromDate.setFullYear(fromDate.getFullYear() - 1);
            break;
          default:
            fromDate.setDate(fromDate.getDate() - 30);
        }
      }

      // Build query for complaints
      let complaintsQuery = complaintsCollection
        .where('createdAt', '>=', fromDate.toISOString())
        .where('createdAt', '<=', toDate.toISOString());

      if (severity) {
        complaintsQuery = complaintsQuery.where('complaint.severity', '==', severity);
      }
      if (status) {
        complaintsQuery = complaintsQuery.where('complaint.status', '==', status);
      }

      const complaintsSnapshot = await complaintsQuery.orderBy('createdAt', 'desc').get();

      const complaints = [];
      complaintsSnapshot.forEach(doc => {
        const data = doc.data();
        complaints.push({
          id: doc.id,
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        });
      });

      // Calculate complaint analytics
      const totalComplaints = complaints.length;
      const resolvedComplaints = complaints.filter(c => c.complaint.status === 'resolved').length;
      const pendingComplaints = complaints.filter(c => c.complaint.status === 'pending').length;
      const investigatingComplaints = complaints.filter(c => c.complaint.status === 'investigating').length;
      const rejectedComplaints = complaints.filter(c => c.complaint.status === 'rejected').length;

      const resolutionRate = totalComplaints > 0 ? ((resolvedComplaints / totalComplaints) * 100).toFixed(2) : 0;

      // Severity distribution
      const severityDistribution = {
        low: complaints.filter(c => c.complaint.severity === 'low').length,
        medium: complaints.filter(c => c.complaint.severity === 'medium').length,
        high: complaints.filter(c => c.complaint.severity === 'high').length,
        urgent: complaints.filter(c => c.complaint.severity === 'urgent').length
      };

      // Category distribution
      const categoryDistribution = {};
      complaints.forEach(complaint => {
        const category = complaint.complaint.category || 'other';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      });

      // Monthly complaint trends
      const monthlyTrends = {};
      complaints.forEach(complaint => {
        if (complaint.createdAt) {
          const monthKey = `${complaint.createdAt.getFullYear()}-${String(complaint.createdAt.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyTrends[monthKey]) {
            monthlyTrends[monthKey] = { total: 0, resolved: 0, pending: 0, investigating: 0, rejected: 0 };
          }
          monthlyTrends[monthKey].total++;
          monthlyTrends[monthKey][complaint.complaint.status]++;
        }
      });

      // Average resolution time
      const resolvedComplaintsWithTime = complaints.filter(c => 
        c.complaint.status === 'resolved' && c.resolution.resolvedAt
      );
      
      let averageResolutionTime = 0;
      if (resolvedComplaintsWithTime.length > 0) {
        const totalResolutionTime = resolvedComplaintsWithTime.reduce((sum, complaint) => {
          const resolvedDate = new Date(complaint.resolution.resolvedAt);
          const createdDate = complaint.createdAt;
          return sum + (resolvedDate.getTime() - createdDate.getTime());
        }, 0);
        averageResolutionTime = Math.round(totalResolutionTime / resolvedComplaintsWithTime.length / (1000 * 60 * 60 * 24)); // in days
      }

      // Technician complaint frequency
      const technicianComplaintCount = {};
      complaints.forEach(complaint => {
        const technicianId = complaint.technician.userId;
        if (technicianId) {
          technicianComplaintCount[technicianId] = (technicianComplaintCount[technicianId] || 0) + 1;
        }
      });

      // Top complained technicians
      const topComplainedTechnicians = Object.entries(technicianComplaintCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([technicianId, count]) => {
          const technicianComplaints = complaints.filter(c => c.technician.userId === technicianId);
          const technician = technicianComplaints[0]?.technician || {};
          return {
            technicianId,
            technicianName: technician.name || 'Unknown',
            complaintCount: count,
            resolvedCount: technicianComplaints.filter(c => c.complaint.status === 'resolved').length
          };
        });

      const reportData = {
        summary: {
          totalComplaints,
          resolvedComplaints,
          pendingComplaints,
          investigatingComplaints,
          rejectedComplaints,
          resolutionRate: parseFloat(resolutionRate),
          averageResolutionTimeDays: averageResolutionTime
        },
        severityDistribution,
        categoryDistribution,
        monthlyTrends: Object.keys(monthlyTrends)
          .sort()
          .map(month => ({
            month,
            ...monthlyTrends[month]
          })),
        topComplainedTechnicians,
        recentComplaints: complaints.slice(0, 10), // Last 10 complaints
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        }
      };

      res.json({
        success: true,
        message: 'Complaint summary report generated successfully',
        data: reportData
      });

    } catch (error) {
      console.error('Error generating complaint summary report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate complaint summary report',
        error: error.message
      });
    }
  }

  // Generate Probation Tracking Report
  static async getProbationTrackingReport(req, res) {
    try {
      const { dateRange = '30d', startDate, endDate } = req.query;

      // Calculate date filters
      let fromDate = new Date();
      let toDate = new Date();

      if (startDate && endDate) {
        fromDate = new Date(startDate);
        toDate = new Date(endDate);
      } else {
        // Default date ranges
        switch (dateRange) {
          case '7d':
            fromDate.setDate(fromDate.getDate() - 7);
            break;
          case '30d':
            fromDate.setDate(fromDate.getDate() - 30);
            break;
          case '90d':
            fromDate.setDate(fromDate.getDate() - 90);
            break;
          case '1y':
            fromDate.setFullYear(fromDate.getFullYear() - 1);
            break;
          default:
            fromDate.setDate(fromDate.getDate() - 30);
        }
      }

      // Get all technicians on probation
      const probationSnapshot = await technicianCollection
        .where('badgeType', '==', 'probation')
        .get();

      const probationTechnicians = [];
      probationSnapshot.forEach(doc => {
        const data = doc.data();
        probationTechnicians.push({
          id: doc.id,
          ...data,
          registeredAt: data.registeredAt?.toDate ? data.registeredAt.toDate() : (data.registeredAt ? new Date(data.registeredAt) : null),
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : (data.approvedAt ? new Date(data.approvedAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
        });
      });

      // Get booking data for probation technicians to track their job completion
      const probationTechnicianIds = probationTechnicians.map(t => t.id);
      
      // Split into chunks to avoid Firestore 'in' query limit of 10
      const bookingPromises = [];
      for (let i = 0; i < probationTechnicianIds.length; i += 10) {
        const chunk = probationTechnicianIds.slice(i, i + 10);
        if (chunk.length > 0) {
          bookingPromises.push(
            bookingsCollection
              .where('technicianId', 'in', chunk)
              .where('createdAt', '>=', fromDate.toISOString())
              .where('createdAt', '<=', toDate.toISOString())
              .get()
          );
        }
      }

      const bookingSnapshots = await Promise.all(bookingPromises);
      const allBookings = [];
      
      bookingSnapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          const data = doc.data();
          allBookings.push({
            id: doc.id,
            ...data,
            createdAt: new Date(data.createdAt),
            scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : null
          });
        });
      });

      // Get complaints against probation technicians
      const complaintPromises = [];
      for (let i = 0; i < probationTechnicianIds.length; i += 10) {
        const chunk = probationTechnicianIds.slice(i, i + 10);
        if (chunk.length > 0) {
          complaintPromises.push(
            complaintsCollection
              .where('technician.userId', 'in', chunk)
              .where('createdAt', '>=', fromDate.toISOString())
              .where('createdAt', '<=', toDate.toISOString())
              .get()
          );
        }
      }

      const complaintSnapshots = await Promise.all(complaintPromises);
      const probationComplaints = [];
      
      complaintSnapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          const data = doc.data();
          probationComplaints.push({
            id: doc.id,
            ...data,
            createdAt: new Date(data.createdAt)
          });
        });
      });

      // Analyze probation performance
      const probationAnalysis = probationTechnicians.map(technician => {
        const technicianBookings = allBookings.filter(b => b.technicianId === technician.id);
        const technicianComplaints = probationComplaints.filter(c => c.technician.userId === technician.id);
        
        const completedJobs = technicianBookings.filter(b => b.status === 'completed').length;
        const totalJobs = technicianBookings.length;
        const complaintCount = technicianComplaints.length;
        
        // Calculate probation progress
        const probationStatus = technician.probationStatus || {};
        const maxJobs = probationStatus.maxJobs || 3;
        const probationProgress = Math.min((completedJobs / maxJobs) * 100, 100);
        
        // Check if probation period has ended
        const probationEndDate = probationStatus.endDate ? new Date(probationStatus.endDate.seconds * 1000) : null;
        const isProbationExpired = probationEndDate ? new Date() > probationEndDate : false;
        
        // Determine status
        let status = 'active';
        if (completedJobs >= maxJobs) {
          status = 'ready_for_promotion';
        } else if (isProbationExpired) {
          status = 'expired';
        } else if (complaintCount > 2) {
          status = 'at_risk';
        }

        return {
          technicianId: technician.id,
          name: technician.name,
          email: technician.email,
          phone: technician.phone,
          serviceCategory: technician.serviceCategory,
          probationStartDate: probationStatus.startDate ? new Date(probationStatus.startDate.seconds * 1000) : technician.approvedAt,
          probationEndDate,
          requiredJobs: maxJobs,
          completedJobs,
          totalJobsAssigned: totalJobs,
          complaintCount,
          probationProgress: parseFloat(probationProgress.toFixed(2)),
          status,
          isProbationExpired,
          daysRemaining: probationEndDate ? Math.max(0, Math.ceil((probationEndDate - new Date()) / (1000 * 60 * 60 * 24))) : 0,
          averageRating: technician.rating || 0
        };
      });

      // Calculate summary statistics
      const totalOnProbation = probationAnalysis.length;
      const readyForPromotion = probationAnalysis.filter(p => p.status === 'ready_for_promotion').length;
      const atRisk = probationAnalysis.filter(p => p.status === 'at_risk').length;
      const expired = probationAnalysis.filter(p => p.status === 'expired').length;
      const active = probationAnalysis.filter(p => p.status === 'active').length;

      const averageProgress = totalOnProbation > 0 
        ? (probationAnalysis.reduce((sum, p) => sum + p.probationProgress, 0) / totalOnProbation).toFixed(2)
        : 0;

      // Monthly probation trends
      const monthlyProbationData = {};
      probationTechnicians.forEach(tech => {
        if (tech.approvedAt) {
          const monthKey = `${tech.approvedAt.getFullYear()}-${String(tech.approvedAt.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyProbationData[monthKey]) {
            monthlyProbationData[monthKey] = { newProbations: 0 };
          }
          monthlyProbationData[monthKey].newProbations++;
        }
      });

      const reportData = {
        summary: {
          totalOnProbation,
          readyForPromotion,
          atRisk,
          expired,
          active,
          averageProgress: parseFloat(averageProgress),
          averageCompletionRate: totalOnProbation > 0 
            ? ((probationAnalysis.reduce((sum, p) => sum + (p.completedJobs / Math.max(p.requiredJobs, 1)), 0) / totalOnProbation) * 100).toFixed(2)
            : 0
        },
        probationTechnicians: probationAnalysis.sort((a, b) => {
          // Sort by status priority: ready_for_promotion, active, at_risk, expired
          const statusPriority = { 'ready_for_promotion': 1, 'active': 2, 'at_risk': 3, 'expired': 4 };
          return statusPriority[a.status] - statusPriority[b.status];
        }),
        monthlyTrends: Object.keys(monthlyProbationData)
          .sort()
          .map(month => ({
            month,
            ...monthlyProbationData[month]
          })),
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        }
      };

      res.json({
        success: true,
        message: 'Probation tracking report generated successfully',
        data: reportData
      });

    } catch (error) {
      console.error('Error generating probation tracking report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate probation tracking report',
        error: error.message
      });
    }
  }

  // Generate and export report (PDF/Excel/CSV)
  static async exportReport(req, res) {
    try {
      const { reportType, format = 'pdf', dateRange = '30d', startDate, endDate } = req.body;

      if (!reportType || !['registration-analytics', 'complaint-summary', 'probation-tracking'].includes(reportType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Must be one of: registration-analytics, complaint-summary, probation-tracking'
        });
      }

      if (!['pdf', 'excel', 'csv'].includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Must be one of: pdf, excel, csv'
        });
      }

      // Get report data first
      let reportData;
      
      switch (reportType) {
        case 'registration-analytics':
          const regReq = { query: { dateRange, startDate, endDate } };
          const regRes = { 
            json: (data) => { reportData = data.data; },
            status: () => ({ json: (data) => { reportData = data.data; } })
          };
          await ReportsController.getRegistrationAnalytics(regReq, regRes);
          break;
          
        case 'complaint-summary':
          const compReq = { query: { dateRange, startDate, endDate } };
          const compRes = { 
            json: (data) => { reportData = data.data; },
            status: () => ({ json: (data) => { reportData = data.data; } })
          };
          await ReportsController.getComplaintSummaryReport(compReq, compRes);
          break;
          
        case 'probation-tracking':
          const probReq = { query: { dateRange, startDate, endDate } };
          const probRes = { 
            json: (data) => { reportData = data.data; },
            status: () => ({ json: (data) => { reportData = data.data; } })
          };
          await ReportsController.getProbationTrackingReport(probReq, probRes);
          break;
      }

      if (!reportData) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate report data'
        });
      }

      // Generate report metadata
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const generatedAt = new Date().toISOString();
      const fileName = `${reportType}_${dateRange}_${new Date().toISOString().split('T')[0]}.${format}`;

      // Generate actual file
      let filePath;
      try {
        switch (format) {
          case 'pdf':
            filePath = await ReportsController.generatePDF(reportData, reportType, fileName);
            break;
          case 'excel':
            filePath = await ReportsController.generateExcel(reportData, reportType, fileName);
            break;
          case 'csv':
            filePath = await ReportsController.generateCSV(reportData, reportType, fileName);
            break;
        }

        // Get file size
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

        // Store report metadata
        ReportsController.reportStorage.set(reportId, {
          reportId,
          reportType,
          format,
          fileName,
          filePath,
          generatedAt,
          size: `${fileSizeInMB} MB`,
          status: 'ready'
        });

        res.json({
          success: true,
          message: 'Report generated successfully',
          data: {
            reportId,
            reportType,
            format,
            fileName,
            generatedAt,
            size: `${fileSizeInMB} MB`,
            downloadUrl: `/api/reports/download/${reportId}`,
            status: 'ready',
            parameters: {
              dateRange,
              startDate,
              endDate
            }
          }
        });

      } catch (fileError) {
        console.error('Error generating file:', fileError);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate report file',
          error: fileError.message
        });
      }

    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export report',
        error: error.message
      });
    }
  }

  // Get report generation status
  static async getReportStatus(req, res) {
    try {
      const { reportId } = req.params;

      // Check if report exists in storage
      const reportData = ReportsController.reportStorage.get(reportId);
      
      if (!reportData) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Check if file still exists
      const fileExists = fs.existsSync(reportData.filePath);
      
      const reportStatus = {
        reportId: reportData.reportId,
        status: fileExists ? reportData.status : 'failed',
        generatedAt: reportData.generatedAt,
        downloadUrl: fileExists ? `/api/reports/download/${reportId}` : null,
        fileName: reportData.fileName,
        size: reportData.size
      };

      res.json({
        success: true,
        data: reportStatus
      });

    } catch (error) {
      console.error('Error getting report status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get report status',
        error: error.message
      });
    }
  }

  // Download generated report
  static async downloadReport(req, res) {
    try {
      const { reportId } = req.params;

      // Get report metadata from storage
      const reportData = ReportsController.reportStorage.get(reportId);
      
      if (!reportData) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      const filePath = reportData.filePath;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Report file not found on disk'
        });
      }

      // Set appropriate headers for file download
      const fileExtension = path.extname(reportData.fileName).toLowerCase();
      let contentType;
      
      switch (fileExtension) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case '.csv':
          contentType = 'text/csv';
          break;
        default:
          contentType = 'application/octet-stream';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${reportData.fileName}"`);
      res.setHeader('Content-Length', fs.statSync(filePath).size);
      
      // Stream the file to response
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error reading report file'
          });
        }
      });
      
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading report:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to download report',
          error: error.message
        });
      }
    }
  }

  // Utility functions for file generation
  static async generatePDF(reportData, reportType, fileName) {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, '../generated_reports');
      await fs.ensureDir(reportsDir);

      const filePath = path.join(reportsDir, fileName);
      
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument();
          const stream = fs.createWriteStream(filePath);
          doc.pipe(stream);

          // Header
          doc.fontSize(20).text('FixMe Moderator Report', 50, 50);
          doc.fontSize(16).text(ReportsController.getReportTitle(reportType), 50, 80);
          doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 110);
          doc.fontSize(12).text(`Date Range: ${new Date(reportData.dateRange.from).toLocaleDateString()} - ${new Date(reportData.dateRange.to).toLocaleDateString()}`, 50, 130);

          let yPos = 170;

          // Content based on report type
          switch (reportType) {
            case 'registration-analytics':
              yPos = ReportsController.addRegistrationContentToPDF(doc, reportData, yPos);
              break;
            case 'complaint-summary':
              yPos = ReportsController.addComplaintContentToPDF(doc, reportData, yPos);
              break;
            case 'probation-tracking':
              yPos = ReportsController.addProbationContentToPDF(doc, reportData, yPos);
              break;
          }

          doc.end();
          stream.on('finish', () => resolve(filePath));
          stream.on('error', reject);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  static addRegistrationContentToPDF(doc, reportData, yPos) {
    doc.fontSize(14).text('Registration Summary', 50, yPos);
    yPos += 30;

    const summary = reportData.summary;
    doc.fontSize(10)
      .text(`Total Registrations: ${summary.totalRegistrations}`, 50, yPos)
      .text(`Approved: ${summary.approvedRegistrations}`, 200, yPos)
      .text(`Rejected: ${summary.rejectedRegistrations}`, 350, yPos);
    yPos += 20;

    doc.text(`Approval Rate: ${summary.approvalRate}%`, 50, yPos)
      .text(`Avg Processing Time: ${summary.averageProcessingTimeDays} days`, 200, yPos);
    yPos += 40;

    // Badge Distribution
    doc.fontSize(12).text('Badge Distribution', 50, yPos);
    yPos += 20;
    doc.fontSize(10);
    Object.entries(reportData.badgeDistribution).forEach(([badge, count]) => {
      doc.text(`${badge.charAt(0).toUpperCase() + badge.slice(1)}: ${count}`, 50, yPos);
      yPos += 15;
    });

    yPos += 20;

    // Service Category Distribution
    doc.fontSize(12).text('Service Category Distribution', 50, yPos);
    yPos += 20;
    doc.fontSize(10);
    Object.entries(reportData.serviceCategoryDistribution).forEach(([category, count]) => {
      doc.text(`${category}: ${count}`, 50, yPos);
      yPos += 15;
    });

    return yPos + 20;
  }

  static addComplaintContentToPDF(doc, reportData, yPos) {
    doc.fontSize(14).text('Complaint Summary', 50, yPos);
    yPos += 30;

    const summary = reportData.summary;
    doc.fontSize(10)
      .text(`Total Complaints: ${summary.totalComplaints}`, 50, yPos)
      .text(`Resolved: ${summary.resolvedComplaints}`, 200, yPos)
      .text(`Pending: ${summary.pendingComplaints}`, 350, yPos);
    yPos += 20;

    doc.text(`Resolution Rate: ${summary.resolutionRate}%`, 50, yPos)
      .text(`Avg Resolution Time: ${summary.averageResolutionTimeDays} days`, 200, yPos);
    yPos += 40;

    // Severity Distribution
    doc.fontSize(12).text('Severity Distribution', 50, yPos);
    yPos += 20;
    doc.fontSize(10);
    Object.entries(reportData.severityDistribution).forEach(([severity, count]) => {
      doc.text(`${severity.charAt(0).toUpperCase() + severity.slice(1)}: ${count}`, 50, yPos);
      yPos += 15;
    });

    yPos += 20;

    // Category Distribution
    doc.fontSize(12).text('Category Distribution', 50, yPos);
    yPos += 20;
    doc.fontSize(10);
    Object.entries(reportData.categoryDistribution).forEach(([category, count]) => {
      doc.text(`${category.replace('_', ' ').toUpperCase()}: ${count}`, 50, yPos);
      yPos += 15;
    });

    return yPos + 20;
  }

  static addProbationContentToPDF(doc, reportData, yPos) {
    doc.fontSize(14).text('Probation Summary', 50, yPos);
    yPos += 30;

    const summary = reportData.summary;
    doc.fontSize(10)
      .text(`Total on Probation: ${summary.totalOnProbation}`, 50, yPos)
      .text(`Ready for Promotion: ${summary.readyForPromotion}`, 200, yPos)
      .text(`At Risk: ${summary.atRisk}`, 350, yPos);
    yPos += 20;

    doc.text(`Average Progress: ${summary.averageProgress}%`, 50, yPos)
      .text(`Completion Rate: ${summary.averageCompletionRate}%`, 200, yPos);
    yPos += 40;

    // Probation Status Overview
    doc.fontSize(12).text('Probation Status Breakdown', 50, yPos);
    yPos += 20;
    doc.fontSize(10);
    
    const statusCount = {
      active: reportData.probationTechnicians.filter(t => t.status === 'active').length,
      ready_for_promotion: reportData.probationTechnicians.filter(t => t.status === 'ready_for_promotion').length,
      at_risk: reportData.probationTechnicians.filter(t => t.status === 'at_risk').length,
      expired: reportData.probationTechnicians.filter(t => t.status === 'expired').length
    };

    Object.entries(statusCount).forEach(([status, count]) => {
      doc.text(`${status.replace('_', ' ').toUpperCase()}: ${count}`, 50, yPos);
      yPos += 15;
    });

    yPos += 20;

    // Top probation cases
    doc.fontSize(12).text('Technician Details (Top 15)', 50, yPos);
    yPos += 20;
    doc.fontSize(9);
    
    reportData.probationTechnicians.slice(0, 15).forEach(tech => {
      if (yPos > 700) { // Check if we need a new page
        doc.addPage();
        yPos = 50;
      }
      doc.text(`${tech.name} - ${tech.serviceCategory} - ${tech.status} (${tech.probationProgress}% complete, ${tech.daysRemaining} days left)`, 50, yPos);
      yPos += 12;
    });

    return yPos + 20;
  }

  static getReportTitle(reportType) {
    switch (reportType) {
      case 'registration-analytics': return 'Registration Analytics Report';
      case 'complaint-summary': return 'Complaint Summary Report';
      case 'probation-tracking': return 'Probation Tracking Report';
      default: return 'Report';
    }
  }

  static async generateExcel(reportData, reportType, fileName) {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, '../generated_reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);
      const workbook = new ExcelJS.Workbook();

      switch (reportType) {
        case 'registration-analytics':
          ReportsController.addRegistrationSheetsToWorkbook(workbook, reportData);
          break;
        case 'complaint-summary':
          ReportsController.addComplaintSheetsToWorkbook(workbook, reportData);
          break;
        case 'probation-tracking':
          ReportsController.addProbationSheetsToWorkbook(workbook, reportData);
          break;
      }

      await workbook.xlsx.writeFile(filePath);
      return filePath;
    } catch (error) {
      console.error('Error generating Excel:', error);
      throw error;
    }
  }

  static async generateCSV(reportData, reportType, fileName) {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, '../generated_reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, fileName);
      
      // Define CSV headers and data based on report type
      let headers, records;
      
      switch (reportType) {
        case 'registration-analytics':
          headers = [
            { id: 'name', title: 'Name' },
            { id: 'email', title: 'Email' },
            { id: 'phone', title: 'Phone' },
            { id: 'serviceCategory', title: 'Service Category' },
            { id: 'badgeType', title: 'Badge Type' },
            { id: 'status', title: 'Status' },
            { id: 'registeredAt', title: 'Registered Date' },
            { id: 'approvedAt', title: 'Approved Date' }
          ];
          records = reportData.recentRegistrations.map(reg => ({
            name: reg.name || '',
            email: reg.email || '',
            phone: reg.phone || '',
            serviceCategory: reg.serviceCategory || '',
            badgeType: reg.badgeType || '',
            status: reg.status || '',
            registeredAt: reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : '',
            approvedAt: reg.approvedAt ? new Date(reg.approvedAt).toLocaleDateString() : ''
          }));
          break;
          
        case 'complaint-summary':
          headers = [
            { id: 'customerName', title: 'Customer Name' },
            { id: 'technicianName', title: 'Technician Name' },
            { id: 'category', title: 'Category' },
            { id: 'severity', title: 'Severity' },
            { id: 'status', title: 'Status' },
            { id: 'createdAt', title: 'Created Date' },
            { id: 'resolvedAt', title: 'Resolved Date' }
          ];
          records = reportData.recentComplaints.map(complaint => ({
            customerName: complaint.customer?.name || '',
            technicianName: complaint.technician?.name || '',
            category: complaint.complaint?.category || '',
            severity: complaint.complaint?.severity || '',
            status: complaint.complaint?.status || '',
            createdAt: complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : '',
            resolvedAt: complaint.resolution?.resolvedAt ? new Date(complaint.resolution.resolvedAt).toLocaleDateString() : ''
          }));
          break;
          
        case 'probation-tracking':
          headers = [
            { id: 'name', title: 'Technician Name' },
            { id: 'email', title: 'Email' },
            { id: 'serviceCategory', title: 'Service Category' },
            { id: 'completedJobs', title: 'Completed Jobs' },
            { id: 'requiredJobs', title: 'Required Jobs' },
            { id: 'probationProgress', title: 'Progress %' },
            { id: 'status', title: 'Status' },
            { id: 'daysRemaining', title: 'Days Remaining' }
          ];
          records = reportData.probationTechnicians.map(tech => ({
            name: tech.name || '',
            email: tech.email || '',
            serviceCategory: tech.serviceCategory || '',
            completedJobs: tech.completedJobs || 0,
            requiredJobs: tech.requiredJobs || 0,
            probationProgress: tech.probationProgress || 0,
            status: tech.status || '',
            daysRemaining: tech.daysRemaining || 0
          }));
          break;
      }

      const csvWriter = createCsvWriter({
        path: filePath,
        header: headers
      });

      await csvWriter.writeRecords(records);
      return filePath;
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw error;
    }
  }

  // HTML generation for PDF
  static generateHTML(reportData, reportType) {
    const currentDate = new Date().toLocaleDateString();
    let title, content;

    switch (reportType) {
      case 'registration-analytics':
        title = 'Registration Analytics Report';
        content = `
          <div class="summary-section">
            <h2>Summary Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Total Registrations</h3>
                <p class="stat-number">${reportData.summary.totalRegistrations}</p>
              </div>
              <div class="stat-card">
                <h3>Approval Rate</h3>
                <p class="stat-number">${reportData.summary.approvalRate}%</p>
              </div>
              <div class="stat-card">
                <h3>Average Processing Time</h3>
                <p class="stat-number">${reportData.summary.averageProcessingTimeDays} days</p>
              </div>
            </div>
            
            <h3>Badge Distribution</h3>
            <ul>
              <li>Professional: ${reportData.badgeDistribution.professional}</li>
              <li>Experience: ${reportData.badgeDistribution.experience}</li>
              <li>Probation: ${reportData.badgeDistribution.probation}</li>
            </ul>
          </div>
        `;
        break;
        
      case 'complaint-summary':
        title = 'Complaint Summary Report';
        content = `
          <div class="summary-section">
            <h2>Complaint Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Total Complaints</h3>
                <p class="stat-number">${reportData.summary.totalComplaints}</p>
              </div>
              <div class="stat-card">
                <h3>Resolution Rate</h3>
                <p class="stat-number">${reportData.summary.resolutionRate}%</p>
              </div>
              <div class="stat-card">
                <h3>Average Resolution Time</h3>
                <p class="stat-number">${reportData.summary.averageResolutionTimeDays} days</p>
              </div>
            </div>
          </div>
        `;
        break;
        
      case 'probation-tracking':
        title = 'Probation Tracking Report';
        content = `
          <div class="summary-section">
            <h2>Probation Overview</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Total on Probation</h3>
                <p class="stat-number">${reportData.summary.totalOnProbation}</p>
              </div>
              <div class="stat-card">
                <h3>Ready for Promotion</h3>
                <p class="stat-number">${reportData.summary.readyForPromotion}</p>
              </div>
              <div class="stat-card">
                <h3>At Risk</h3>
                <p class="stat-number">${reportData.summary.atRisk}</p>
              </div>
            </div>
          </div>
        `;
        break;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
          .header h1 { color: #6366f1; margin: 0; }
          .header p { margin: 5px 0; color: #666; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
          .stat-card h3 { margin: 0 0 10px 0; color: #475569; font-size: 14px; }
          .stat-number { font-size: 24px; font-weight: bold; color: #6366f1; margin: 0; }
          .summary-section { margin-bottom: 30px; }
          .summary-section h2 { color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
          .summary-section h3 { color: #475569; margin-top: 25px; }
          ul { list-style-type: none; padding: 0; }
          li { background: #f1f5f9; margin: 5px 0; padding: 10px; border-radius: 4px; border-left: 4px solid #6366f1; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on: ${currentDate}</p>
          <p>Date Range: ${new Date(reportData.dateRange.from).toLocaleDateString()} - ${new Date(reportData.dateRange.to).toLocaleDateString()}</p>
        </div>
        ${content}
      </body>
      </html>
    `;
  }

  // Excel workbook builders
  static addRegistrationSheetsToWorkbook(workbook, reportData) {
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Registration Analytics Summary']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Registrations', reportData.summary.totalRegistrations]);
    summarySheet.addRow(['Approved Registrations', reportData.summary.approvedRegistrations]);
    summarySheet.addRow(['Rejected Registrations', reportData.summary.rejectedRegistrations]);
    summarySheet.addRow(['Pending Registrations', reportData.summary.pendingRegistrations]);
    summarySheet.addRow(['Approval Rate (%)', reportData.summary.approvalRate]);
    summarySheet.addRow(['Average Processing Time (days)', reportData.summary.averageProcessingTimeDays]);

    // Details sheet
    const detailsSheet = workbook.addWorksheet('Registration Details');
    detailsSheet.addRow(['Name', 'Email', 'Phone', 'Service Category', 'Badge Type', 'Status', 'Registered Date', 'Approved Date']);
    
    reportData.recentRegistrations.forEach(reg => {
      detailsSheet.addRow([
        reg.name || '',
        reg.email || '',
        reg.phone || '',
        reg.serviceCategory || '',
        reg.badgeType || '',
        reg.status || '',
        reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : '',
        reg.approvedAt ? new Date(reg.approvedAt).toLocaleDateString() : ''
      ]);
    });

    // Style headers
    [summarySheet, detailsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach(column => {
        column.width = 15;
      });
    });
  }

  static addComplaintSheetsToWorkbook(workbook, reportData) {
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Complaint Summary');
    summarySheet.addRow(['Complaint Analytics Summary']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Complaints', reportData.summary.totalComplaints]);
    summarySheet.addRow(['Resolved Complaints', reportData.summary.resolvedComplaints]);
    summarySheet.addRow(['Pending Complaints', reportData.summary.pendingComplaints]);
    summarySheet.addRow(['Resolution Rate (%)', reportData.summary.resolutionRate]);
    summarySheet.addRow(['Average Resolution Time (days)', reportData.summary.averageResolutionTimeDays]);

    // Details sheet
    const detailsSheet = workbook.addWorksheet('Complaint Details');
    detailsSheet.addRow(['Customer', 'Technician', 'Category', 'Severity', 'Status', 'Created Date', 'Resolved Date']);
    
    reportData.recentComplaints.forEach(complaint => {
      detailsSheet.addRow([
        complaint.customer?.name || '',
        complaint.technician?.name || '',
        complaint.complaint?.category || '',
        complaint.complaint?.severity || '',
        complaint.complaint?.status || '',
        complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : '',
        complaint.resolution?.resolvedAt ? new Date(complaint.resolution.resolvedAt).toLocaleDateString() : ''
      ]);
    });

    // Style headers
    [summarySheet, detailsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach(column => {
        column.width = 15;
      });
    });
  }

  static addProbationSheetsToWorkbook(workbook, reportData) {
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Probation Summary');
    summarySheet.addRow(['Probation Tracking Summary']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total on Probation', reportData.summary.totalOnProbation]);
    summarySheet.addRow(['Ready for Promotion', reportData.summary.readyForPromotion]);
    summarySheet.addRow(['At Risk', reportData.summary.atRisk]);
    summarySheet.addRow(['Expired', reportData.summary.expired]);
    summarySheet.addRow(['Average Progress (%)', reportData.summary.averageProgress]);

    // Details sheet
    const detailsSheet = workbook.addWorksheet('Probation Details');
    detailsSheet.addRow(['Name', 'Email', 'Service Category', 'Completed Jobs', 'Required Jobs', 'Progress %', 'Status', 'Days Remaining']);
    
    reportData.probationTechnicians.forEach(tech => {
      detailsSheet.addRow([
        tech.name || '',
        tech.email || '',
        tech.serviceCategory || '',
        tech.completedJobs || 0,
        tech.requiredJobs || 0,
        tech.probationProgress || 0,
        tech.status || '',
        tech.daysRemaining || 0
      ]);
    });

    // Style headers
    [summarySheet, detailsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach(column => {
        column.width = 15;
      });
    });
  }
}

module.exports = ReportsController;