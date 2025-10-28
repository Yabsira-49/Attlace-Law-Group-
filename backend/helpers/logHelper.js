exports.createLog = async (pool, user, activity_type, details) => {
    await pool.query(
        "INSERT INTO system_logs (actor_id, actor_role, activity_type, details) VALUES ($1, $2, $3, $4)",
        [user.userId, user.role, activity_type, details]
    );
};
