import mongoose from 'mongoose';

const doctorDashboardStatsSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true },
    patientsInQueue: { type: Number, default: 0 },
    todayConsultations: { type: Number, default: 0 },
    completedToday: { type: Number, default: 0 },
    followUps: { type: Number, default: 0 },
    // Segments for donut chart
    completedCount: { type: Number, default: 73 },
    pendingCount: { type: Number, default: 16 },
    cancelledCount: { type: Number, default: 9 }
  },
  { timestamps: true }
);

const DoctorDashboardStats = mongoose.model('DoctorDashboardStats', doctorDashboardStatsSchema);
export default DoctorDashboardStats;
