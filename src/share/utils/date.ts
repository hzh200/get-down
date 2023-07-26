const convertDateTimeToUnixTime = (datetime: string): string => {
    const date = new Date(datetime);
    return date.getTime().toString();
};

const convertDateTimeToDate = (datetime: string): string => {
    const date = new Date(datetime);
    return date.toLocaleDateString();
};

export { convertDateTimeToUnixTime, convertDateTimeToDate };