((exporter) => {
    exporter.config = {
        app_theme: 'nature',
        app_variator: {
            up: 6,
            down: 0
        },
        permissions: {
            // Common permissions
            LOGIN:          0x0001,
            UPDATE:         0x0002,
            WEB_INTERFACE:  0x0004,
            LOGS:           0x0008,
            ITEMS:          0x0010,
            STATISTICS:     0x0020,
            BUSINESSES:     0x0040,
            USERS:          0x0080,
            CHARACTERS:     0x0100,
            MAILING:        0x0200,
            MAP:            0x0400,
            ACTIONS:        0x0800,
            ORIGINS:        0x1000,
            BINDS:          0x2000
        }
    }
})(typeof module === 'object' && typeof module.exports === 'object' && module.exports || window)