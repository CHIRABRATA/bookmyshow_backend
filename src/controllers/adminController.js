const db = require('../config/db');

/**
 * Compiles system-wide box office revenue metrics and occupancy ratios
 */
const getDashboardStats = async (req, res) => {
  try {
    // 1. Calculate high-level financial KPIs across all confirmed bookings
    const globalStatsQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(id) AS total_bookings_count
      FROM bookings 
      WHERE status = 'CONFIRMED';
    `;
    const globalRes = await db.query(globalStatsQuery);

    // 2. Compute the exact overall seat fill percentage across all generated schedules
    const seatOccupancyQuery = `
      SELECT 
        COUNT(*) AS total_seats_in_system,
        SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) AS occupied_seats_count
      FROM seats;
    `;
    const occupancyRes = await db.query(seatOccupancyQuery);

    const totalSeats = parseInt(occupancyRes.rows[0].total_seats_in_system) || 0;
    const occupiedSeats = parseInt(occupancyRes.rows[0].occupied_seats_count) || 0;
    
    // Safety check to handle division by zero if database is completely blank
    const occupancyRatePercentage = totalSeats > 0 
      ? parseFloat(((occupiedSeats / totalSeats) * 100).toFixed(2)) 
      : 0;

    // 3. Perform relational matrix aggregation to get a breakdown by individual movie title
    const movieBreakdownQuery = `
      SELECT 
        m.id AS movie_id,
        m.title AS movie_title,
        COUNT(DISTINCT b.id) AS tickets_sold_count,
        COALESCE(SUM(b.total_amount), 0) AS total_movie_revenue
      FROM movies m
      LEFT JOIN shows s ON m.id = s.movie_id
      LEFT JOIN bookings b ON s.id = b.show_id AND b.status = 'CONFIRMED'
      GROUP BY m.id, m.title
      ORDER BY total_movie_revenue DESC;
    `;
    const movieRes = await db.query(movieBreakdownQuery);

    // 4. Package data points together cleanly
    res.status(200).json({
      success: true,
      summary: {
        lifetime_revenue: parseFloat(globalRes.rows[0].total_revenue),
        total_successful_transactions: parseInt(globalRes.rows[0].total_bookings_count),
        global_occupancy_ratio: `${occupancyRatePercentage}%`
      },
      movie_performance_ledger: movieRes.rows
    });

  } catch (error) {
    console.error("Admin Aggregation Engine Crash:", error);
    res.status(500).json({ error: "Internal server error calculating operational dashboard statistics." });
  }
};

module.exports = {
  getDashboardStats
};