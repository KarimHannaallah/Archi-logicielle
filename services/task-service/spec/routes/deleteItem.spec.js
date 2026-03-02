const { makeDeleteItem } = require('../../src/routes/deleteItem');

test('it removes item correctly', async () => {
    const mockService = {
        deleteTodo: jest.fn().mockResolvedValue(undefined),
    };
    const deleteItem = makeDeleteItem(mockService);

    const req = { userId: 'test-user', params: { id: '12345' } };
    const res = { sendStatus: jest.fn() };

    await deleteItem(req, res);

    expect(mockService.deleteTodo).toHaveBeenCalledTimes(1);
    expect(mockService.deleteTodo).toHaveBeenCalledWith('test-user', '12345');
    expect(res.sendStatus).toHaveBeenCalledTimes(1);
    expect(res.sendStatus).toHaveBeenCalledWith(200);
});
