


exports.book_format = (row) => {
    return {
        id: row.id,
        title: row.title,
        author: row.author.split(';').join(', '),
        price: row.price,
        image: row.image,
        discount: row.discount,
        inventory: row.inventory,
        rate: row.rate
    };
}
