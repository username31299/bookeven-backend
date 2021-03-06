const database = require('../database/connection');
const config = require('../helpers/config');
const booksHelper = require('../helpers/booksHelper');
const ordersHelper = require('../helpers/ordersHelper');
const authController = require('./authController');
const utils = require('../helpers/utils');

exports.get_book_data = (req, res) => {
    try {
        var book_id = req.body.id;
        var query_string = `SELECT 
                                b.id, 
                                b.name, 
                                b.author, 
                                b.size,
                                b.page,
                                b.weight,
                                b.published_date,
                                b.price,
                                b.image,
                                b.description,
                                b.discount,
                                b.bookfield_id,
                                b.inventory
                            FROM books b
                            LEFT JOIN bookfields bf
                            ON b.bookfield_id = bf.id
                            WHERE b.id = ${book_id}`;
        var user_id = 0;
        if (req.headers.id && req.headers.email) {
            user_id = req.headers.id;
        }
        var query_string_bought = `SELECT
                                        o.user_id, 
                                        o.id, 
                                        o.status, 
                                        od.book_id 
                                    FROM orders o 
                                    LEFT JOIN orderdetails od 
                                    ON o.id = od.order_id 
                                    WHERE o.user_id = ${user_id} 
                                    AND od.book_id = ${book_id} 
                                    AND o.status = 2`;
        database.query(`${query_string};${query_string_bought}`, (err, rows, fields) => {
            if (!err) {
                if (rows[0].length > 0) {
                    var info = rows[0][0];
                    info.bought = (rows[1].length > 0);
                    res.status(200).json(info);
                } else {
                    res.status(202).json({ message: "Không xử lý được yêu cầu" });
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

exports.add_new_book = (req, res) => {
    try {
        var body = req.body;

        var book = [
            { key: "name", value: `${body.title}` },
            { key: "author", value: `${body.author}` },
            { key: "size", value: `${body.size}` },
            { key: "page", value: `${body.numPage}` },
            { key: "weight", value: `${body.weight}` },
            { key: "published_date", value: `${body.publishDate}` },
            { key: "price", value: parseInt(body.price) },
            { key: "bookfield_id", value: parseInt(body.bookField) },
            { key: "description", value: `${body.description}` },
            { key: "image", value: `${body.image}` },
            { key: "inventory", value: parseInt(body.inventory) },
            { key: "discount", value: parseFloat(body.discount) }
        ];

        indexes = book.map(e => e.key).join(', ');
        values = book.map(e => {
            if (utils.isInt(e.value))
                return e.value;
            return `\'${e.value}\'`;
        }).join(', ');

        var query_string = `INSERT INTO books(${indexes}) VALUE (${values})`;

        database.query(`${query_string};
                        SELECT LAST_INSERT_ID() AS 'id' FROM books`, (err, rows, fields) => {
            if (!err) {
                var id = rows[1][0];
                var data = {};
                book.forEach(e => { data[e.key] = e.value });
                data.id = id;
                res.status(201).json(data);
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

exports.update_book = (req, res) => {
    try {
        var body = req.body;

        var book = [
            { key: "name", value: `${body.title}` },
            { key: "author", value: `${body.author}` },
            { key: "size", value: `${body.size}` },
            { key: "page", value: `${body.numPage}` },
            { key: "weight", value: `${body.weight}` },
            { key: "published_date", value: `${body.publishDate}` },
            { key: "price", value: parseInt(body.price) },
            { key: "bookfield_id", value: parseInt(body.bookField) },
            { key: "description", value: `${body.description}` },
            { key: "image", value: `${body.image}` },
            { key: "inventory", value: parseFloat(body.inventory) },
            { key: "discount", value: parseFloat(body.discount) }
        ];

        set_values = book.map(e => `${e.key} = \'${e.value}\'`).join(', ');

        var query_string = `UPDATE books SET ${set_values} WHERE id = ${body.id}`;

        database.query(query_string, (err, rows, fields) => {
            if (!err) {
                res.status(200).json({ message: "Đã cập nhật sách thành công" });
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

exports.delete_book = (req, res) => {
    try {
        var book_id = req.body.id;

        database.query(`DELETE FROM books WHERE id = ?`, [book_id], (err, rows, fields) => {
            if (!err) {
                res.status(200).json({ message: "Đã xóa sách thành công" });
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

exports.list_book_by_field = (req, res) => {
    try {
        var bookfield_id = req.body.bookField_id;
        var amount = req.body.amount;
        var page = req.body.page;

        var query_string = `SELECT
                                b.id,
                                b.name AS 'title',
                                b.author,
                                b.price,
                                b.image,
                                b.discount,
                                b.inventory,
                                IFNULL((SELECT ROUND(AVG(r.rate),1) FROM rates r WHERE r.book_id = b.id),0) AS 'rate'
                            FROM
                                books b
                            WHERE
                                bookfield_id = ${bookfield_id}
                            LIMIT ${(page - 1) * amount}, ${amount}`;
        var query_string_total = `SELECT COUNT(*) AS 'total'
                                    FROM books 
                                    WHERE bookfield_id = ${bookfield_id}`;

        database.query(`${query_string};${query_string_total}`, (err, rows, fields) => {
            if (!err) {
                if (rows[0].length > 0) {
                    var books = rows[0].map(e => booksHelper.book_format(e));
                    console.dir(books);
                    if (rows[1].length > 0) {
                        var total = rows[1][0].total;
                        res.status(200).json({ books: books, total: total });
                    } else {
                        res.status(202).json({ message: "Không xử lý được yêu cầu" })
                    }
                } else {
                    res.status(202).json({ message: "Không xử lý được yêu cầu" })
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

exports.list_book_best_rate = (req, res) => {
    try {
        var bookfield_id = req.body.bookField_id;

        var query_string = `SELECT
                                b.id,
                                b.name AS 'title',
                                b.author,
                                b.price,
                                b.image,
                                b.discount,
                                ROUND(AVG(r.rate),1) AS 'rate'
                            FROM rates r
                            RIGHT JOIN books b
                            ON r.book_id = b.id
                            WHERE b.bookfield_id = ${bookfield_id}
                            AND rate IS NOT NULL
                            GROUP BY r.book_id
                            ORDER BY rate DESC
                            LIMIT 5`;

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

exports.list_book_newest = (req, res) => {
    try {
        var amount = req.body.amount;
        var page = req.body.page;

        var query_string = `SELECT
                                b.id,
                                b.name AS 'title',
                                b.author,
                                b.price,
                                b.image,
                                b.discount,
                                b.inventory,
                                b.published_date,
                                IFNULL((SELECT ROUND(AVG(r.rate),1) FROM rates r WHERE r.book_id = b.id),0) AS 'rate'
                            FROM books b
                            ORDER BY published_date DESC, b.id
                            LIMIT ${(page - 1) * amount}, ${amount}`;
        var query_string_total = `SELECT COUNT(*) AS 'total' FROM books`;
        database.query(`${query_string};${query_string_total}`, (err, rows, fields) => {
            if (!err) {
                res.status(200).json({ books: rows[0], total: rows[1][0].total });
            } else {
                console.dir(err);
                res.status(500).json({ message: "Đã có lỗi xảy ra" });
            }
        });
    } catch (e) {
        console.dir(e);
        res.status(500).json({ message: "Đã có lỗi xảy ra" });
    }
}

exports.filter = (req, res) => {
    try {
        database.query(`SELECT b.id, b.name, b.author, b.price, b.image, b.discount, b.inventory,
                        ROUND(AVG(r.rate), 1) AS rate, bf.id AS bookfield
                        FROM books b LEFT JOIN rates r ON r.book_id = b.id 
                        LEFT JOIN bookfields bf ON bf.id = b.bookfield_id
                        GROUP BY b.id;
                        `, (err, rows, field) => {

            if (!err) {
                if (rows.length > 0) {
                    let body = req.body;
                    //filter 
                    if (body.title !== "") {
                        rows = rows.filter((row) => {
                            return row.name.toLowerCase().includes(body.title.toLowerCase());
                        })
                    }
                    if (body.bookField !== "") {
                        rows = rows.filter((row) => {
                            return row.bookfield === body.bookField;
                        })
                    }
                    if (body.minRate !== "") {
                        rows = rows.filter((row) => {
                            if (row !== null){
                                return row.rate >= body.minRate;
                            }
                        })
                    }
                    if (body.maxRate !== "") {
                        rows = rows.filter((row) => {
                            if (row !== null){
                                return row.rate <= body.maxRate;
                            }
                        })
                    }
                    if (body.minPrice !== "") {
                        rows = rows.filter((row) => {
                            return row.price >= body.minPrice;
                        })
                    }
                    if (body.maxPrice !== "") {
                        rows = rows.filter((row) => {
                            return row.price <= body.maxPrice;
                        })
                    }
                    //give result 
                    let result = {
                        books: [],
                        total: 0,
                    }

                    rows.map((row) =>
                        result.books.push({
                            id: row.id,
                            title: row.name,
                            author: row.author,
                            price: row.price,
                            image: row.image,
                            discount: row.discount,
                            inventory: row.inventory,
                            rate: row.rate,
                        })
                    )
                    let start = (body.page - 1) * body.amount;
                    let end = start + body.amount;
                    result.books = result.books.slice(start, end);
                    result.total = rows.length;

                    res.status(200).json(result);
                } else {
                    res.status(200).json([]);
                }
            } else {
                res.status(202).json({ message: "Không xử lý được yêu cầu" })
            }
        })

    } catch (e) {
        res.status(500).json({ message: "Đã có lỗi xảy ra" });
    }
};

exports.list_book_best_seller = (req, res) => {
    try {
        var amount = req.body.amount;
        var page = req.body.page;
        var query_string = `SELECT
                                b.id,
                                b.name AS 'title',
                                b.author,
                                b.price,
                                b.image,
                                b.discount,
                                b.inventory,
                                IFNULL((SELECT ROUND(AVG(r.rate),1) FROM rates r WHERE r.book_id = b.id),0) AS 'rate',
                                IFNULL((SELECT SUM(amount) FROM orderdetails od WHERE od.book_id = b.id),0) AS 'sold'
                            FROM books b
                            ORDER BY (SELECT SUM(amount) FROM orderdetails od WHERE od.book_id = b.id) DESC, b.id
                            LIMIT ${(page - 1) * amount}, ${amount}`;
        var query_string_total = `SELECT COUNT(*) AS 'total' FROM books`;
        database.query(`${query_string};${query_string_total}`, (err, rows, fields) => {
            if (!err) {
                var total = rows[1][0].total;
                var data = rows[0];
                res.status(200).json({ books: data, total: total });
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

exports.list_book_best_sales = (req, res) => {
    try {
        var amount = req.body.amount;
        var page = req.body.page;

        var query_string = `SELECT
                                b.id,
                                b.name AS 'title',
                                b.author,
                                b.price,
                                b.image,
                                b.discount,
                                b.inventory,
                                IFNULL((SELECT ROUND(AVG(r.rate),1) FROM rates r WHERE r.book_id = b.id),0) AS 'rate'
                            FROM books b
                            ORDER BY b.discount DESC
                            LIMIT ${(page - 1) * amount}, ${amount}`;
        var query_string_total = `SELECT COUNT(*) AS 'total' FROM books`;
        database.query(`${query_string};${query_string_total}`, (err, rows, fields) => {
            if (!err) {
                var total = rows[1][0].total;
                var data = rows[0];
                res.status(200).json({ books: data, total: total });
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
