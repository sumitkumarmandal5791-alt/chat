import userUserStore from "../../store/useruserStore"


const Setting = () => {
    const { user } = userUserStore()
    return (
        <div>
            <h1>
                {user?.username}
            </h1>
        </div>
    )
}
export default Setting