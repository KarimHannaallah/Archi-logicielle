const { makeUpdateItem } = require('../../src/routes/updateItem');

const ITEM = { id: '1234', name: 'New title', completed: false };

test('it updates items correctly', async () => {
    const mockService = {
        updateTodo: jest.fn().mockResolvedValue(undefined),
        getTodo: jest.fn().mockResolvedValue(ITEM),
    };
    const updateItem = makeUpdateItem(mockService);

    const req = {
        params: { id: '1234' },
        body: { name: 'New title', completed: false },
    };
    const res = { send: jest.fn() };

    await updateItem(req, res);

    expect(mockService.updateTodo).toHaveBeenCalledTimes(1);
    expect(mockService.updateTodo).toHaveBeenCalledWith('1234', 'New title', false);

    expect(mockService.getTodo).toHaveBeenCalledTimes(1);
    expect(mockService.getTodo).toHaveBeenCalledWith('1234');

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(ITEM);
});
