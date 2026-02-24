const { makeAddItem } = require('../../src/routes/addItem');

test('it stores item correctly', async () => {
    const expectedItem = { id: 'some-uuid', name: 'A sample item', completed: false };
    const mockService = {
        createTodo: jest.fn().mockResolvedValue(expectedItem),
    };
    const addItem = makeAddItem(mockService);

    const req = { userId: 'test-user', body: { name: 'A sample item' } };
    const res = { send: jest.fn() };

    await addItem(req, res);

    expect(mockService.createTodo).toHaveBeenCalledTimes(1);
    expect(mockService.createTodo).toHaveBeenCalledWith('test-user', 'A sample item');
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedItem);
});
