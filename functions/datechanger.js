const dateformat = (timestamp) => {
    const date = new Date(timestamp);
    const formatted_date = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1 ).padStart(2, '0')}/${date.getFullYear()}`;
    return formatted_date
}

const month_year_format = (timestamp) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1 ).padStart(2, '0');
    const year = date.getFullYear();

    const formatted = `${month}/${year}`
    return formatted
}

const year_only_format = (timestamp) =>{
    const date = new Date(timestamp);
    const year = date.getFullYear();
    return year
}

module.exports = {
    dateformat,
    month_year_format,
    year_only_format
}