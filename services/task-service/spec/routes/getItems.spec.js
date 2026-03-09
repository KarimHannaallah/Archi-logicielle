const { makeGetItems } = require('../../src/routes/getItems');

const ITEMS = [{ id: 12345 }];

test('it gets items correctly', async () => {
    const mockService = {
        listTodos: jest.fn().mockResolvedValue(ITEMS),
    };
    const getItems = makeGetItems(mockService);

    const req = { userId: 'test-user' , query: {} };
    const res = { send: jest.fn() };

    await getItems(req, res);

    expect(mockService.listTodos).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(ITEMS);
});
