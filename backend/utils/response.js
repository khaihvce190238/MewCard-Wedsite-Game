export const ok = (res, data = null, extra = {}) => res.status(200).json({ success: true, data, ...extra });
export const created = (res, data = null, extra = {}) => res.status(201).json({ success: true, data, ...extra });
