const database = require('../database/connection');
const config = require('../helpers/config');

exports.get_cart_data = (req, res) => {
    try {
        var user_id = req.headers.id;
        var query_string = `SELECT 
                                b.id,
                                b.name, 
                                b.author, 
                                b.price, 
                                b.discount, 
                                c.amount, 
                                b.image,
                                b.inventory
                            FROM carts c
                            LEFT JOIN books b
                            ON b.id = c.book_id
                            WHERE user_id = ${user_id}`;

        database.query(query_string, (err, rows, fields) => {
            if (!err) {
                rows.map(e => {
                    e.author = e.author.split(';').join(', ');
                    return e;
                });
                res.status(200).json(rows);
            } else {
                console.dir(err);
                res.status(500).json({ message: "Đã có lỗi xảy ra" });
            }
        });
    } catch (e) {
        console.dir(e);
        res.status(500).json({ message: "Đã có lỗi xảy ra" });
    }
};


exports.add_book = (req, res) => {
    try {
        var user_id = req.headers.id;
        var book_id = req.body.book_id;
        var amount = req.body.amount;

        var query_string_1 = `INSERT INTO carts(book_id, user_id, amount) VALUE (${book_id},${user_id},${amount})`;

        var query_string_2 = `SELECT 
                                b.id,
                                b.name,
                                b.author,
                                b.price, 
                                b.image,
                                b.discount,
                                b.inventory
                            FROM books b
                            WHERE b.id = ${book_id}`;
        database.query(`${query_string_1};${query_string_2}`, (err, rows, fields) => {
            if (!err) {
                res.status(201).json(rows[1][0]);
            } else {
                console.dir(err);
                res.status(500).json({ message: "Đã có lỗi xảy ra" });
            }
        });
    } catch (e) {
        console.dir(e);
        res.status(500).json({ message: "Đã có lỗi xảy ra" });
    }
};

exports.add_book_ver_hai_hai = (req, res) => {
    try {
        var user_id = req.headers.id;
        var book_id = req.body.book_id;
        var amount = req.body.amount;

        database.query(`SELECT * FROM carts WHERE book_id = ? AND user_id = ?; SELECT inventory FROM books WHERE id = ?`, [book_id, user_id, book_id], (err, rows, fields) => {
            if (!err) {
                if (rows[0].length > 0) {
                    var info = rows[0][0];
                    console.dir(info);

                    var new_amount = (parseInt(info.amount) + parseInt(amount));
                    if (new_amount <= rows[1][0].inventory) {
                        req.body.amount = new_amount;
                        this.update_amount(req, res);
                    } else {
                        res.status(202).json({ message: "Số lượng sách vượt quá lượng sách đang có" });
                    }
                } else {
                    this.add_book(req, res);
                }
            } else {
                console.dir(err);
                res.status(500).json({ message: "Đã có lỗi xảy ra" });
            }
        });
    } catch (e) {
        console.dir(e);
        res.status(500).json({ message: "Đã có lỗi xảy ra" });
    }
};

exports.remove_book = (req, res) => {
    try {
        var user_id = req.headers.id;
        var book_id = req.body.book_id;

        database.query(`DELETE FROM carts WHERE book_id = ? AND user_id = ?`, [book_id, user_id], (err, rows, fields) => {
            if (!err) {
                res.status(200).json({ message: "Bỏ sách ra khỏi giỏ thành công" })
            } else {
                console.dir(err);
                res.status(500).json({ message: "Đã có lỗi xảy ra" });
            }
        });
    } catch (e) {
        console.dir(e);
        res.status(500).json({ message: "Đã có lỗi xảy ra" });
    }
};

exports.update_amount = (req, res) => {
    try {
        var amount = req.body.amount;
        var user_id = req.headers.id;
        var book_id = req.body.book_id;

        database.query(`UPDATE carts SET amount = ? WHERE book_id = ? AND user_id = ?`, [amount, book_id, user_id], (err, rows, fields) => {
            if (!err) {
                res.status(200).json({ message: "Cập nhật số lượng thành công" })
            } else {
                console.dir(err);
                res.status(500).json({ message: "Đã có lỗi xảy ra" });
            }
        });
    } catch (e) {
        console.dir(e);
        res.status(500).json({ message: "Đã có lỗi xảy ra" });
    }
};

exports.remove_all_book = (user_id) => {
    try {
        database.query('DELETE FROM carts WHERE user_id = ?', [user_id], (err, rows, fields) => {
            if (!err) {
                return true;
            } else {
                console.dir(err);
                return false;
            }
        })
    } catch (e) {
        console.dir(e);
        return false;
    }
};
