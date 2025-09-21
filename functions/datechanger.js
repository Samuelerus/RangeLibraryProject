const dateformat = (timestamp) => {
    const date = new Date(timestamp);
    const formatted_date = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    return formatted_date
}

const month_year_format = (timestamp) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const formatted = `${month}/${year}`
    return formatted
}

const year_only_format = (timestamp) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    return year
}

const year_range = (year) => {
    const start_of_year = new Date(`${year}-01-01T00:00:00Z`).getTime();
    const end_of_year = new Date(`${year}-12-31T23:59:59Z`).getTime();
    const range = [start_of_year, end_of_year]
    return range
}

const month_range = (month) => {
    const start_of_month = new Date(`${month}-01T00:00:00Z`).getTime();
    const end_of_month = new Date(`${month}-31T23:59:59Z`).getTime();
    const range = [start_of_month, end_of_month]
    return range
}

module.exports = {
    dateformat,
    month_year_format,
    year_only_format,
    year_range,
    month_range
}