const pool = require('../config/database');

exports.getMatchQueue = async (req, res) => {
  try {
    const { mode } = req.query;
    
    const userResult = await pool.query('SELECT campus, mode FROM users WHERE user_id = $1', [req.userId]);
    const currentUser = userResult.rows[0];
    
    const searchMode = mode || currentUser.mode;

    const blockedUsers = await pool.query(
      'SELECT blocked_id FROM blocks WHERE blocker_id = $1',
      [req.userId]
    );
    const blockedIds = blockedUsers.rows.map(row => row.blocked_id);

    const swipedUsers = await pool.query(
      'SELECT swiped_id FROM swipes WHERE swiper_id = $1',
      [req.userId]
    );
    const swipedIds = swipedUsers.rows.map(row => row.swiped_id);

    const excludeIds = [...blockedIds, ...swipedIds, req.userId];

    let query = `
      SELECT u.user_id, u.username, u.avatar_url, u.campus, u.mode, 
             p.year, p.course, p.bio, p.interests, p.hobbies
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE u.campus = $1 
        AND u.user_id != ALL($2)
        AND u.mode = $3
      ORDER BY RANDOM()
      LIMIT 20
    `;

    const result = await pool.query(query, [currentUser.campus, excludeIds, searchMode]);

    res.json({ queue: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch match queue' });
  }
};

exports.swipe = async (req, res) => {
  try {
    const { swipedId, direction } = req.body;

    await pool.query(
      'INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES ($1, $2, $3)',
      [req.userId, swipedId, direction]
    );

    if (direction === 'right') {
      const mutualSwipe = await pool.query(
        'SELECT * FROM swipes WHERE swiper_id = $1 AND swiped_id = $2 AND direction = $3',
        [swipedId, req.userId, 'right']
      );

      if (mutualSwipe.rows.length > 0) {
        await pool.query(
          'INSERT INTO matches (user_a, user_b, status, matched_at) VALUES ($1, $2, $3, NOW())',
          [req.userId, swipedId, 'matched']
        );

        const chatResult = await pool.query(
          'INSERT INTO chats (type, expires_at) VALUES ($1, $2) RETURNING chat_id',
          ['direct', new Date(new Date().setHours(24, 0, 0, 0))]
        );

        const chatId = chatResult.rows[0].chat_id;

        await pool.query(
          'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
          [chatId, req.userId, swipedId]
        );

        return res.json({ match: true, chatId });
      }
    }

    res.json({ match: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Swipe failed' });
  }
};

exports.getMatches = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.match_id, m.matched_at,
             u.user_id, u.username, u.avatar_url, u.campus
      FROM matches m
      JOIN users u ON (u.user_id = m.user_b AND m.user_a = $1) OR (u.user_id = m.user_a AND m.user_b = $1)
      WHERE (m.user_a = $1 OR m.user_b = $1) AND m.status = 'matched'
      ORDER BY m.matched_at DESC
    `, [req.userId]);

    res.json({ matches: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

exports.getStudyPartners = async (req, res) => {
  try {
    const { course, year, study_style } = req.query;

    const userResult = await pool.query('SELECT campus FROM users WHERE user_id = $1', [req.userId]);
    const campus = userResult.rows[0].campus;

    let query = `
      SELECT u.user_id, u.username, u.avatar_url, u.campus,
             p.year, p.course, p.study_style, p.study_time, p.interests
      FROM users u
      JOIN profiles p ON u.user_id = p.user_id
      WHERE u.campus = $1 AND u.user_id != $2 AND u.mode = 'study'
    `;

    const params = [campus, req.userId];
    let paramIndex = 3;

    if (course) {
      query += ` AND p.course = $${paramIndex}`;
      params.push(course);
      paramIndex++;
    }

    if (year) {
      query += ` AND p.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }

    if (study_style) {
      query += ` AND p.study_style = $${paramIndex}`;
      params.push(study_style);
    }

    query += ' ORDER BY RANDOM() LIMIT 20';

    const result = await pool.query(query, params);

    res.json({ partners: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch study partners' });
  }
};
